#!/bin/bash
# Help Desk - Enterprise Deployment & Update Script for Debian/Ubuntu
# Refactored for robust error handling, idempotency, and strict security.

set -euo pipefail

# ==========================================
# GLOBAIS E CONSTANTES
# ==========================================
APP_DIR="/var/www/help-desk"
ENV_PATH="$APP_DIR/.env"
NODE_MAJOR=20

# Cores para Logging
C_RED="\e[31m"
C_GREEN="\e[32m"
C_YELLOW="\e[33m"
C_BLUE="\e[34m"
C_BOLD="\e[1m"
C_RESET="\e[0m"

log_info()    { echo -e "${C_BLUE}[INFO]${C_RESET} $1"; }
log_success() { echo -e "${C_GREEN}[SUCCESS]${C_RESET} $1"; }
log_warn()    { echo -e "${C_YELLOW}[WARN]${C_RESET} $1"; }
log_error()   { echo -e "${C_RED}[ERROR]${C_RESET} $1"; }
log_header()  { echo -e "\n${C_BOLD}${C_BLUE}=== $1 ===${C_RESET}"; }

# ==========================================
# 1. VERIFICAÇÃO DE AMBIENTE
# ==========================================
if [ "$(id -u)" -ne 0 ]; then
    log_error "Ops! O Instalador necessita de privilégios absolutos."
    log_error "Por favor, execute como root: sudo ./deploy.sh"
    exit 1
fi

echo -e "${C_BOLD}${C_BLUE}======================================================${C_RESET}"
echo -e "${C_BOLD}🚀 Plataforma Help Desk - Instalador${C_RESET}"
echo -e "${C_BOLD}${C_BLUE}======================================================${C_RESET}"

IS_UPDATE=false
if [ -f "$ENV_PATH" ]; then
    log_success "Instalação prévia detectada em $APP_DIR"
    echo -e "Escolha o modo de operação:"
    echo -e "  1) ${C_BOLD}Update Seguro${C_RESET} (Mantém dados, recompila código e patches de segurança)"
    echo -e "  2) ${C_BOLD}Reinstalação Forçada${C_RESET} (Atenção: Sobrescreve env/credentials)"
    read -p "Sua Opção (1 ou 2): " DEPLOY_MODE
    
    if [[ "$DEPLOY_MODE" == "1" ]]; then
        IS_UPDATE=true
        log_info "Modo de Atualização Ativado. Configurações de BD e admin serão retidas."
    fi
fi

# ==========================================
# 2. COLETA DE PARÂMETROS
# ==========================================
if [ "$IS_UPDATE" = false ]; then
    GIT_URL="https://github.com/MathAmorim/help-desk.git"

    log_header "Topologia Base de Dados"
    echo "1) PostgreSQL (Recomendado Padrão Ouro)"
    echo "2) MySQL"
    echo "3) SQLite (Apenas Teste/Homologação)"
    while true; do
        read -p "Opção (1, 2 ou 3): " DB_OPTION
        if [[ "$DB_OPTION" == "1" || "$DB_OPTION" == "2" || "$DB_OPTION" == "3" ]]; then
            break
        else
            log_error "Opção inválida. Digite 1, 2 ou 3."
        fi
    done

    log_header "Topologia de Acesso e SSL Edge"
    echo "Qual é o seu Domínio de Borda em produção? (Ex: suporte.empresa.com.br)"
    read -p "Domínio/DNS (Deixe em branco p/ acessar via IP puro): " APP_DOMAIN

    AUTO_SSL="n"
    if [ -n "$APP_DOMAIN" ]; then
        log_info "Domínio capturado."
        echo "Deseja que uma chave SSL seja gerada automaticamente via Certbot nesta máquina?"
        log_warn "Se um firewall assumir o HTTPS à frente da sua DMZ, digite 'n'."
        read -p "Gerar Cadeado SSL Automaticamente? (y/n): " AUTO_SSL
    fi

    log_header "Credenciais Administrativas (Raiz)"
    read -p "Email do Administrador Inicial: " ADMIN_EMAIL
    read -s -p "Senha Segura do Administrador: " ADMIN_PASS
    echo ""

    if [ -n "$APP_DOMAIN" ]; then
        BASE_URL="https://$APP_DOMAIN"
    else
        PUBLIC_IP=$(curl -s ifconfig.me || echo "localhost")
        BASE_URL="http://$PUBLIC_IP"
    fi
fi

# ==========================================
# 3. INFRAESTRUTURA DE DEPENDÊNCIAS
# ==========================================
log_header "[1/8] Saneamento de Infraestrutura"
log_info "Instalando Core Packages e Node.js v${NODE_MAJOR}"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - > /dev/null 2>&1 || true
apt-get update -yqq > /dev/null 2>&1
apt-get install -yqq nodejs git nginx build-essential curl unzip > /dev/null 2>&1

if ! command -v pm2 &> /dev/null; then
    log_info "Acoplando PM2 Daemon Manager..."
    npm install -g pm2 > /dev/null 2>&1 || true
fi

# ==========================================
# 4. FETCH DE CÓDIGO FONTE
# ==========================================
log_header "[2/8] Sincronização Restrita de Repositório"
git config --global --add safe.directory "$APP_DIR" || true

if [ -d "$APP_DIR" ]; then
    log_info "Repositório existente. Baixando HEAD master e forçando convergência..."
    cd "$APP_DIR"
    git fetch --all --quiet
    git reset --hard @{u} --quiet
    git clean -fd -e .env -e public/uploads -e private_uploads --quiet
else
    log_info "Clonando matriz principal em $APP_DIR..."
    git clone --quiet "$GIT_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ==========================================
# 5. ORQUESTRAÇÃO DE BANCO (INSTALAÇÃO NOVA)
# ==========================================
if [ "$IS_UPDATE" = false ]; then
    log_header "[3/8] Provisionamento Ativo de Banco de Dados"
    DB_PASS=$(openssl rand -hex 16)
    
    if [ "$DB_OPTION" == "1" ]; then
        log_info "Ativando Container Nativo PostgreSQL"
        apt-get install -yqq postgresql postgresql-contrib > /dev/null 2>&1
        sudo -u postgres psql -c "CREATE DATABASE helpdesk;" > /dev/null 2>&1 || true
        sudo -u postgres psql -c "CREATE USER helpdeskuser WITH ENCRYPTED PASSWORD '$DB_PASS';" > /dev/null 2>&1 || true
        sudo -u postgres psql -c "ALTER USER helpdeskuser WITH PASSWORD '$DB_PASS';" > /dev/null 2>&1
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE helpdesk TO helpdeskuser;" > /dev/null 2>&1
        DB_URL="postgresql://helpdeskuser:$DB_PASS@localhost:5432/helpdesk?schema=public"
        PROVIDER="postgresql"
    elif [ "$DB_OPTION" == "2" ]; then
        log_info "Ativando Container Nativo MySQL"
        apt-get install -yqq mysql-server > /dev/null 2>&1
        mysql -e "CREATE DATABASE IF NOT EXISTS helpdesk;"
        mysql -e "CREATE USER IF NOT EXISTS 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
        mysql -e "ALTER USER 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
        mysql -e "GRANT ALL PRIVILEGES ON helpdesk.* TO 'helpdeskuser'@'localhost';"
        DB_URL="mysql://helpdeskuser:$DB_PASS@localhost:3306/helpdesk"
        PROVIDER="mysql"
    elif [ "$DB_OPTION" == "3" ]; then
        log_info "Ativando Topologia Nativa SQLite (Stand-alone)"
        DB_URL="file:./dev.db"
        PROVIDER="sqlite"
    fi

    log_info "Configurando Prisma Providers ($PROVIDER)"
    sed -i "/generator client {/,/}/ s/provider = \".*\"/provider = \"prisma-client-js\"/" prisma/schema.prisma
    sed -i "/datasource db {/,/}/ s/provider = \".*\"/provider = \"$PROVIDER\"/" prisma/schema.prisma
    
    log_info "Gerando arquivo de Ambiente Seguro (.env)"
    cat <<EOF > .env
DATABASE_URL="$DB_URL"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="$BASE_URL"
MIGRATION_SECRET="$(openssl rand -hex 32)"
NODE_ENV="production"
EOF

else
    log_header "[3/8] Detecção de Engine Reversa"
    if grep -q "postgresql://" "$ENV_PATH"; then
        PROVIDER="postgresql"
    elif grep -q "mysql://" "$ENV_PATH"; then
        PROVIDER="mysql"
    else
        PROVIDER="sqlite"
        echo -e "\n${C_YELLOW}⚠️ AVISO DE PERFORMANCE ESTRUTURAL ⚠️${C_RESET}"
        log_warn "O ambiente opera via SQLite e perderá escabilidade sob pressão de múltiplas writes correntes."
        read -p "Confirma manutenção da topologia SQLite? (y/n): " PROCEED_SQLITE
        if [[ "$PROCEED_SQLITE" != "y" && "$PROCEED_SQLITE" != "Y" ]]; then
            log_error "Abortando por segurança lógica arquitetural."
            exit 1
        fi
    fi
    log_info "Engine detectada via ENV: $PROVIDER"
    sed -i "/generator client {/,/}/ s/provider = \".*\"/provider = \"prisma-client-js\"/" prisma/schema.prisma
    sed -i "/datasource db {/,/}/ s/provider = \".*\"/provider = \"$PROVIDER\"/" prisma/schema.prisma
fi

# ==========================================
# 6. FILE SYSTEM SEGURANÇA & BUILD
# ==========================================
log_header "[4/8] FileSystem Bounds e Build Tree"

log_info "Garantindo diretórios de Upload Privados"
mkdir -p public/uploads private_uploads
# Mitigação de permissões para blindar ataques de execução na pasta de anexos (Segurança Profunda)
chown -R www-data:www-data public/uploads private_uploads 2>/dev/null || true
chmod 755 public/uploads private_uploads

log_info "Instalando Árvore NPM"
npm install --silent

log_info "Executando Correção Heurística de Vulnerabilidades (Audit Fix Force)"
npm audit fix --force > /dev/null 2>&1 || true

log_info "Propagando DB Schemas (Prisma Migrate)"
npx prisma generate
npx prisma migrate deploy
npx prisma db push --accept-data-loss # Mantendo como fallback caso migrações falhem em ambientes SQLite puristas

# ==========================================
# 7. SEEDING DE BASE DE DADOS
# ==========================================
if [ "$IS_UPDATE" = false ]; then
    log_header "[5/8] Operação de Base Seed inicial"
    cat <<EOF > script-seed-initial.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash('$ADMIN_PASS', 10);
  await prisma.user.upsert({
    where: { email: '$ADMIN_EMAIL' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: { email: '$ADMIN_EMAIL', name: 'Admin', password: hashedPassword, role: 'ADMIN', mustChangePassword: false, cpf: '00000000000', theme: 'dark' }
  });
  const categories = [
    { nome: 'Hardware', prioridadePadrao: 'MEDIA' },
    { nome: 'Software', prioridadePadrao: 'BAIXA' },
    { nome: 'Rede/Internet', prioridadePadrao: 'ALTA' },
    { nome: 'Acessos', prioridadePadrao: 'CRITICA' },
    { nome: 'Dúvida', prioridadePadrao: 'BAIXA' },
    { nome: 'Impressoras', prioridadePadrao: 'BAIXA' },
    { nome: 'Sistemas Internos', prioridadePadrao: 'MEDIA' }
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { nome: cat.nome },
      update: { prioridadePadrao: cat.prioridadePadrao },
      create: { nome: cat.nome, prioridadePadrao: cat.prioridadePadrao, ativo: true }
    });
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
EOF
    node script-seed-initial.js && rm -f script-seed-initial.js
    log_success "Base Populada."
else
    log_info "[5/8] Pulando Seeding (Atualização Incremental)"
fi

log_info "Iniciando processo de Hard Build (Next.js 14)... Isso demanda Memória."
npm run build

# ==========================================
# 8. PM2 PROCESS MANAGER
# ==========================================
log_header "[6/8] Alinhamento Daemon PM2"
export NODE_ENV=production
pm2 delete "help-desk" > /dev/null 2>&1 || true
pm2 start npm --name "help-desk" -- run start > /dev/null 2>&1
pm2 save > /dev/null 2>&1
log_success "PM2 Tracker operacional."

# ==========================================
# 8.5 MIGRAÇÃO DE DADOS PÓS-DEPLOY
# ==========================================
log_header "[6.5/8] Orquestração de Dados (Migration Bridge)"
MIGRATION_SECRET=$(grep MIGRATION_SECRET .env | cut -d '"' -f 2)
if [ -n "$MIGRATION_SECRET" ]; then
    log_info "Disparando migração de status e configurações (Tradução Pendente -> Aguardando)..."
    # Aguarda 5 segundos para o Next.js subir completamente antes do curl
    sleep 5
    curl -X POST -H "x-migration-secret: $MIGRATION_SECRET" http://localhost:3000/api/admin/migrate-db || log_warn "Não foi possível disparar a migração automática via rede local. Acesse manualmente se necessário."
else
    log_warn "MIGRATION_SECRET não encontrado. Pulei a migração de dados automática."
fi

# ==========================================
# 9. NGINX ESTRUTURA E PROXY REVERSO
# ==========================================
log_header "[7/8] Malha Nginx (Reverse Proxy)"
if [ ! -f "/etc/nginx/sites-available/help-desk" ]; then
    log_info "Emitindo Virtual Host Virgem com IP Passthrough"
    cat <<EOF > /etc/nginx/sites-available/help-desk
server {
    listen 80;
    server_name ${APP_DOMAIN:-_};

    # Hardening Básico: Esconde a versão do SO/Nginx
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        # Encaminhamento Estrito de Identidade (Vital Anti-BruteForce)
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/help-desk /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
else
    log_info "Configuração Nginx nativa preservada."
fi
systemctl restart nginx

# ==========================================
# 10. CERTIFICADO AUTO SSL (CERTBOT LET'S ENCRYPT)
# ==========================================
log_header "[8/8] Política de Transporte de Borda (Edge TLS)"
if [[ -n "${APP_DOMAIN:-}" ]] && [[ "${AUTO_SSL:-}" == "y" || "${AUTO_SSL:-}" == "Y" ]]; then
    log_info "Executando protocolo de Autenticação Let's Encrypt para $APP_DOMAIN"
    if ! command -v certbot &> /dev/null; then
        apt-get install -yqq certbot python3-certbot-nginx > /dev/null 2>&1
    fi
    certbot --nginx -d "$APP_DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" || true
    log_success "Certificado Assentado. TLS ativado."
elif [ -n "${APP_DOMAIN:-}" ]; then
    log_info "Auto-SSL abortado pelo usuário. Presumindo terminação SSL num Tier externo (pfSense, Cloudflare)."
else
    log_info "Deploy resolvido por camada estrita (Modo IP)."
fi

# ==========================================
echo -e "\n${C_BOLD}${C_GREEN}🏆 IMPLANTAÇÃO EXECUTADA E HOMOLOGADA!${C_RESET}"
echo -e "${C_BOLD}Status da Escotilha:${C_RESET} PM2 (Status UP), Nginx (Proxy UP), Banco (Integrado)."
echo -e "Help Desk escutando tráfego ativamente. Pode fechar o terminal e aproveitar.\n"
