#!/bin/bash
# Help Desk - Deploy & Update Script for Ubuntu/Debian

# Faz o script ser abortado imediatamente se qualquer comando falhar
set -e

APP_DIR="/var/www/help-desk"
ENV_PATH="$APP_DIR/.env"

# Verificação de Root (Portável)
if [ "$(id -u)" -ne 0 ]; then
  echo -e "\e[31mPor favor, rode o script como root (sudo ./deploy.sh)\e[0m"
  exit 1
fi

echo -e "\e[0;34m======================================================"
echo -e "🚀 Help Desk - Instalador & Atualizador (Ubuntu/Debian)"
echo -e "\e[0;34m======================================================"

# --- Lógica de Detecção de Instalação Existente ---
IS_UPDATE=false
if [ -f "$ENV_PATH" ]; then
    echo -e "\e[0;32m[!] Instalação existente detectada em $APP_DIR\e[0m"
    echo "Como deseja prosseguir?"
    echo "1) Aplicar Atualizações de Código e Segurança (Rápido/Mantém Dados)"
    echo "2) Reinstalação Completa (Sobrescreve configurações)"
    read -p "Opção (1 ou 2): " DEPLOY_MODE
    if [ "$DEPLOY_MODE" == "1" ]; then
        IS_UPDATE=true
    fi
fi

if [ "$IS_UPDATE" = true ]; then
    echo -e "\n🔄 \e[1mModo de Atualização Ativado.\e[0m Pulando configurações de banco e admin...\n"
else
    # Configuração Inicial (Modo Instalador)
    GIT_URL="https://github.com/MathAmorim/help-desk.git"

    echo ""
    echo "Qual Banco de Dados em produção deseja utilizar?"
    echo "1) PostgreSQL"
    echo "2) MySQL"
    read -p "Opção (1 ou 2): " DB_OPTION

    echo ""
    echo "==== CREDENCIAIS DO PRIMEIRO ACESSO ===="
    echo -e "Este usuário será o \e[1mAdministrador\e[0m principal para você governar o painel inicial."
    read -p "Digite o email de Administrador inicial do sistema: " ADMIN_EMAIL
    read -s -p "Digite a senha do Administrador: " ADMIN_PASS
    echo ""
fi

# 1. Infraestrutura
echo -e "\n📦 [1/7] Verificando infraestrutura e dependências..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || true
apt-get update
apt-get install -y nodejs git nginx build-essential curl unzip

if ! command -v pm2 &> /dev/null; then
  echo "📦 Instalando PM2 (Process Manager)..."
  npm install -g pm2 || true
fi

# 2. Código Fonte
echo -e "\n💻 [2/7] Sincronizando o Código Fonte..."
# Corrige erro de "dubious ownership" do Git (comum ao rodar como root)
git config --global --add safe.directory "$APP_DIR" || true
if [ -d "$APP_DIR" ]; then
  cd $APP_DIR
  echo "Limpando mudanças locais e sincronizando com o repositório..."
  git fetch --all
  # Reseta o código local para bater 100% com o que está no Git (resolve conflito de package-lock)
  git reset --hard @{u}
  git clean -fd -e .env -e public/uploads
else
  echo "Clonando repositório inicial..."
  git clone $GIT_URL $APP_DIR
  cd $APP_DIR
fi

# 3. Banco de Dados (Pula se for Update)
if [ "$IS_UPDATE" = false ]; then
    echo -e "\n🗄️ [3/7] Provisionando o Banco de Dados..."
    DB_PASS=$(openssl rand -hex 16)
    
    if [ "$DB_OPTION" == "1" ]; then
        echo "Instalando e Configurando o PostgreSQL..."
        apt-get install -y postgresql postgresql-contrib
        sudo -u postgres psql -c "CREATE DATABASE helpdesk;" > /dev/null 2>&1 || true
        sudo -u postgres psql -c "CREATE USER helpdeskuser WITH ENCRYPTED PASSWORD '$DB_PASS';" > /dev/null 2>&1 || true
        sudo -u postgres psql -c "ALTER USER helpdeskuser WITH PASSWORD '$DB_PASS';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE helpdesk TO helpdeskuser;"
        DB_URL="postgresql://helpdeskuser:$DB_PASS@localhost:5432/helpdesk?schema=public"
        PROVIDER="postgresql"
    else
        echo "Instalando e Configurando o MySQL..."
        apt-get install -y mysql-server
        mysql -e "CREATE DATABASE IF NOT EXISTS helpdesk;"
        mysql -e "CREATE USER IF NOT EXISTS 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
        mysql -e "ALTER USER 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
        mysql -e "GRANT ALL PRIVILEGES ON helpdesk.* TO 'helpdeskuser'@'localhost';"
        DB_URL="mysql://helpdeskuser:$DB_PASS@localhost:3306/helpdesk"
        PROVIDER="mysql"
    fi

    # Configura Prisma & ENV
    echo -e "\n⚙️ [4/7] Convertendo os drivers do ORM Prisma para '$PROVIDER'..."
    sed -i '/generator client {/,/}/ s/provider = ".*"/provider = "prisma-client-js"/' prisma/schema.prisma
    sed -i '/datasource db {/,/}/ s/provider = ".*"/provider = "'$PROVIDER'"/' prisma/schema.prisma
    
    # Setup ENV
    echo "Configurando as variáveis de ambiente (.env)..."
    cat <<EOF > .env
DATABASE_URL="$DB_URL"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
EOF
else
    echo -e "\n🗄️ [3/7] Carregando configurações de Banco de Dados existentes..."
    # Apenas garante que os diretórios necessários existam
    mkdir -p public/uploads
fi

# 4. Build & Segurança
echo -e "\n🏗️ [4/7] Limpando vulnerabilidades e compilando aplicação..."
npm install
echo "Aplicando patches de segurança automatizados (Audit Fix)..."
npm audit fix --force || true

echo "Gerando Prisma Client..."
npx prisma generate
npx prisma db push --accept-data-loss

# 5. Seed (Apenas se não for Update ou se o usuário quiser forçar)
if [ "$IS_UPDATE" = false ]; then
    echo -e "\n🌱 [5/7] Semeando dados iniciais (Admin e Categorias)..."
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
  console.log("✓ Administrador configurado.");

  // 2. Criar/Atualizar Categorias Padrão
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
      create: { 
        nome: cat.nome, 
        prioridadePadrao: cat.prioridadePadrao,
        ativo: true 
      }
    });
  }
  console.log("✓ Categorias padrão semeadas.");
}

main()
  .then(() => console.log("🌱 Seed concluído com sucesso!"))
  .catch(e => console.error("❌ Falha no seed:", e))
  .finally(() => prisma.\$disconnect());
EOF
    node script-seed-initial.js && rm script-seed-initial.js
else
    echo -e "\n🌱 [5/7] Pulando Seed (Instalação já existente)."
fi

echo "Iniciando build (Isso pode demorar um pouco)..."
npm run build

# 6. Processos
echo -e "\n🌐 [6/7] Reiniciando os serviços (PM2)..."
pm2 delete "help-desk" > /dev/null 2>&1 || true
pm2 start npm --name "help-desk" -- run start
pm2 save

# 7. Nginx
if [ ! -f "/etc/nginx/sites-available/help-desk" ]; then
    echo -e "\n🛡️ [7/7] Configurando Reverso NGINX pela primeira vez..."
    cat <<EOF > /etc/nginx/sites-available/help-desk
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/help-desk /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    systemctl restart nginx
else
    echo -e "\n🛡️ [7/7] NGINX já configurado. Reiniciando por segurança..."
    systemctl restart nginx
fi
echo "======================================================"
echo -e "\n\e[0;32m🏆 PROCESSO CONCLUÍDO COM SUCESSO!\e[0m"
echo "======================================================"
echo "O Help Desk está atualizado e rodando na porta 80."
