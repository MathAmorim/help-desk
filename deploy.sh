#!/bin/bash
# Help Desk - Deploy Script for Ubuntu/Debian

# Faz o script ser abortado imediatamente se qualquer comando falhar
set -e

# Verificação de Root (Portável)
if [ "$(id -u)" -ne 0 ]; then
  echo -e "\e[31mPor favor, rode o script como root (sudo ./deploy.sh)\e[0m"
  exit 1
fi

echo -e "\e[0;34m======================================================"
echo -e "🚀 Help Desk - Instalador Automático (Ubuntu/Debian)  "
echo -e "\e[0;34m======================================================"

# URL do Repositório
GIT_URL_BASE="github.com/MathAmorim/help-desk.git"

echo ""
read -p "O repositório é privado? (s/n): " IS_PRIVATE
if [ "$IS_PRIVATE" = "s" ] || [ "$IS_PRIVATE" = "S" ]; then
    read -p "Digite seu Personal Access Token (PAT) do GitHub: " GIT_TOKEN
    GIT_URL="https://$GIT_TOKEN@$GIT_URL_BASE"
else
    GIT_URL="https://$GIT_URL_BASE"
fi

echo ""
echo "Qual Banco de Dados em produção deseja utilizar?"
echo "1) PostgreSQL"
echo "2) MySQL"
read -p "Opção (1 ou 2): " DB_OPTION

echo ""
echo "==== CREDENCIAIS DO PRIMEIRO ACESSO ===="
echo -e "Este usuário será o \e[1mAdministrador\e[0m principal para você governar o painel inicial."
read -p "Digite o email de Administrador inicial do sistema (não precisa ser real, ex: admin@empresa.com): " ADMIN_EMAIL
read -s -p "Digite a senha do Administrador: " ADMIN_PASS
echo ""

# Install base packages
echo -e "\n📦 [1/7] Instalando infraestrutura e dependências do servidor..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update
apt-get install -y nodejs git nginx build-essential curl unzip

# Install PM2
if ! command -v pm2 &> /dev/null; then
  echo "📦 Instalando PM2 (Process Manager)..."
  npm install -g pm2 || true
fi

# Generate secure credentials
DB_PASS=$(openssl rand -hex 16)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
APP_DIR="/var/www/help-desk"

# Clone/Pull repo
echo -e "\n💻 [2/7] Preparando o Código Fonte..."

if [ -d "$APP_DIR" ]; then
  echo -e "\e[0;34mDiretório $APP_DIR já existe.\n\e[0m Atualizando..."
  cd $APP_DIR
  git pull
  # Limpeza profunda de arquivos não-rastreados que podem sujar o build
  # Excluímos o .env e o public/uploads para não deletar os dados do usuário
  git clean -fd -e .env -e public/uploads
else
  echo -e "\e[0;34mClonando o repositório...\e[0m"
  git clone $GIT_URL $APP_DIR
  cd $APP_DIR
fi

# Database Setup
echo -e "\n🗄️ [3/7] Provisionando o Banco de Dados escolhido..."
if [ "$DB_OPTION" == "1" ]; then
  echo "Instalando e Configurando o PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  
  # Setup Postgres User and DB (Ignores errors if they already exist across deployments)
  sudo -u postgres psql -c "CREATE DATABASE helpdesk;" > /dev/null 2>&1 || true
  # Se o usuario ja existe, o CREATE falha (|| true), mas o ALTER garante a senha correta
  sudo -u postgres psql -c "CREATE USER helpdeskuser WITH ENCRYPTED PASSWORD '$DB_PASS';" > /dev/null 2>&1 || true
  sudo -u postgres psql -c "ALTER USER helpdeskuser WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE helpdesk TO helpdeskuser;"
  sudo -u postgres psql -c "ALTER DATABASE helpdesk OWNER TO helpdeskuser;"
  
  DB_URL="postgresql://helpdeskuser:$DB_PASS@localhost:5432/helpdesk?schema=public"
  PROVIDER="postgresql"

elif [ "$DB_OPTION" == "2" ]; then
  echo "Instalando e Configurando o MySQL..."
  apt-get install -y mysql-server
  
  mysql -e "CREATE DATABASE IF NOT EXISTS helpdesk;"
  # Se o usuario ja existe, o CREATE nao faz nada, entao forçamos o ALTER para o novo DB_PASS
  mysql -e "CREATE USER IF NOT EXISTS 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
  mysql -e "ALTER USER 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
  mysql -e "GRANT ALL PRIVILEGES ON helpdesk.* TO 'helpdeskuser'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"
  
  DB_URL="mysql://helpdeskuser:$DB_PASS@localhost:3306/helpdesk"
  PROVIDER="mysql"
else
  echo -e "\e[0;31m\e[1mOpção de Banco Inválida. Abortando processo.\e[0m"
  exit 1
fi

# Configure Prisma Provider
echo -e "\n⚙️ [4/7] Convertendo os drivers do ORM Prisma para '$PROVIDER'..."
# Garante que o gerador nao seja alterado acidentalmente
sed -i '/generator client {/,/}/ s/provider = ".*"/provider = "prisma-client-js"/' prisma/schema.prisma
# Substitui o provedor apenas no bloco datasource db
sed -i '/datasource db {/,/}/ s/provider = ".*"/provider = "'$PROVIDER'"/' prisma/schema.prisma

# Setup ENV
echo "Configurando as variáveis de ambiente (.env)..."
cat <<EOF > .env
DATABASE_URL="$DB_URL"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"
EOF

# Install & Build
echo -e "\n🏗️  [5/7] Instalando pacotes NodeJS e compilando o Next.js..."
npm install

echo "Configurando diretórios de armazenamento e permissões..."
mkdir -p public/uploads
chmod -R 775 public/uploads
chown -R www-data:www-data public/uploads || true

echo -e "Gerando Prisma Client e migrando as tabelas SQL..."
if ! command -v npx &> /dev/null; then
  echo -e "⚠️ npx não encontrado. Tentando instalar..."
  npm install -g npx || true
fi
npx prisma generate
npx prisma db push --accept-data-loss

echo -e "Populando o banco de dados inicial (Admin e Categorias)..."
cat <<EOF > script-seed-initial.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // 1. Criar/Atualizar Administrador
  const hashedPassword = await bcrypt.hash('$ADMIN_PASS', 10);
  await prisma.user.upsert({
    where: { email: '$ADMIN_EMAIL' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      email: '$ADMIN_EMAIL',
      name: 'Super Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      mustChangePassword: false,
      cpf: '00000000000',
      theme: 'dark'
    }
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
node script-seed-initial.js
rm script-seed-initial.js

echo "Habilitando o Build de Produção (Isso pode demorar um pouco)..."
npm run build

echo -e "\n🌐 [6/7] Inicializando a Aplicação como processo resiliente (PM2)..."
pm2 delete "help-desk" > /dev/null 2>&1 || true
pm2 start npm --name "help-desk" -- run start
pm2 save
pm2 startup

echo -e "\n🛡️ [7/7] Configurando Reverso NGINX para hospedar com segurança na Porta 80..."
cat <<EOF > /etc/nginx/sites-available/help-desk
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/help-desk /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo ""
echo "======================================================"
echo "🏆 DEPLOY CONCLUÍDO COM SUCESSO!                      "
echo "======================================================"
echo -e "\e[0;32m[✓] Seu banco $PROVIDER está rodando mascarado protegido.\e[0m"
echo -e "\e[0;32m[✓] Seu Next.js está rodando em PM2 contínuo.\e[0m"
echo -e "\e[0;32m[✓] NGINX está roteando as portas nativas local -> Net.\e[0m"
echo ""
echo -e "\e[0;33mConsulte o DEPLOY_LINUX.md para saber os passos finais manuais!\e[0m"
