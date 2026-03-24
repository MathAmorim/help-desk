# Help Desk - Deploy Script for Ubuntu/Debian

# Faz o script ser abortado imediatamente se qualquer comando falhar
set -e

# Ensure script is run as root
if [ "$EUID" -ne 0 ]
  then echo "Por favor, rode o script como root (sudo ./deploy.sh)"
  exit
fi

echo "======================================================"
echo "🚀 Help Desk - Instalador Automático (Ubuntu/Debian)  "
echo "======================================================"

# URL do Repositório (Hardcoded pelo usuário)
GIT_URL="https://github.com/MathAmorim/help-desk.git"

echo ""
echo "Qual Banco de Dados em produção deseja utilizar?"
echo "1) PostgreSQL"
echo "2) MySQL"
read -p "Opção (1 ou 2): " DB_OPTION

echo ""
echo "==== CREDENCIAIS DO PRIMEIRO ACESSO ===="
echo "Este usuário será o Administrador principal para você governar o painel inicial."
read -p "Digite o email de Administrador inicial do sistema (não precisa ser real, ex: admin@empresa.com): " ADMIN_EMAIL
read -s -p "Digite a senha do Administrador: " ADMIN_PASS
echo ""

# Install base packages
echo -e "\n📦 [1/7] Instalando infraestrutura e dependências do servidor..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update
apt-get install -y nodejs git nginx build-essential curl unzip

# Install PM2
npm install -g pm2

# Generate secure credentials
DB_PASS=$(openssl rand -hex 16)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
APP_DIR="/var/www/help-desk"

# Clone/Pull repo
echo -e "\n💻 [2/7] Preparando o Código Fonte..."
if [ -d "$APP_DIR" ]; then
  echo "Diretório $APP_DIR já existe. Baixando últimas atualizações..."
  cd $APP_DIR
  git pull
else
  echo "Clonando o repositório..."
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
  sudo -u postgres psql -c "CREATE USER helpdeskuser WITH ENCRYPTED PASSWORD '$DB_PASS';" > /dev/null 2>&1 || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE helpdesk TO helpdeskuser;"
  sudo -u postgres psql -c "ALTER DATABASE helpdesk OWNER TO helpdeskuser;"
  
  DB_URL="postgresql://helpdeskuser:$DB_PASS@localhost:5432/helpdesk?schema=public"
  PROVIDER="postgresql"

elif [ "$DB_OPTION" == "2" ]; then
  echo "Instalando e Configurando o MySQL..."
  apt-get install -y mysql-server
  
  mysql -e "CREATE DATABASE IF NOT EXISTS helpdesk;"
  mysql -e "CREATE USER IF NOT EXISTS 'helpdeskuser'@'localhost' IDENTIFIED BY '$DB_PASS';"
  mysql -e "GRANT ALL PRIVILEGES ON helpdesk.* TO 'helpdeskuser'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"
  
  DB_URL="mysql://helpdeskuser:$DB_PASS@localhost:3306/helpdesk"
  PROVIDER="mysql"
else
  echo "Opção de Banco Inválida. Abortando processo."
  exit 1
fi

# Configure Prisma Provider
echo -e "\n⚙️ [4/7] Convertendo os drivers do ORM Prisma para '$PROVIDER'..."
sed -i "s/provider = \".*\"/provider = \"$PROVIDER\"/" prisma/schema.prisma

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

echo "Gerando Prisma Client e migrando as tabelas SQL..."
npx prisma generate
npx prisma db push --accept-data-loss

echo "Populando o banco de dados inicial (Seed)..."
npx prisma db seed || echo "Seed ignorado (não detectado no package.json)"

echo "Criando Cartão de Administrador Mestre ($ADMIN_EMAIL)..."
cat <<EOF > script-seed-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash('$ADMIN_PASS', 10);
  
  await prisma.user.create({
    data: {
      email: '$ADMIN_EMAIL',
      name: 'Super Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      mustChangePassword: false
    }
  }).catch(e => {
    return prisma.user.update({
      where: { email: '$ADMIN_EMAIL' },
      data: { password: hashedPassword, role: 'ADMIN' }
    });
  });
}
main().then(() => console.log("Admin forjado com sucesso!")).catch(e => console.error("Falha ao criar admin:", e)).finally(() => prisma.\$disconnect());
EOF
node script-seed-admin.js
rm script-seed-admin.js

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
echo "✓ Seu banco $PROVIDER está rodando mascarado protegido."
echo "✓ Seu Next.js está rodando em PM2 contínuo."
echo "✓ NGINX está roteando as portas nativas local -> Net."
echo ""
echo "Consulte o DEPLOY_LINUX.md para saber os passos finais manuais!"
echo "Ex: apontar seu DNS e dar cargo Admin para sua conta."
