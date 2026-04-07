#!/bin/bash
# ===================================================
# Help Desk — Recuperação de Senha de Administrador
# ===================================================
# 
# Uso:  sudo ./reset-password.sh
#       (Executar na raiz do projeto ou em /var/www/help-desk)
#
# ===================================================
clear
set -euo pipefail

C_RED="\e[31m"
C_GREEN="\e[32m"
C_YELLOW="\e[33m"
C_BLUE="\e[34m"
C_BOLD="\e[1m"
C_RESET="\e[0m"

log_info()    { echo -e "${C_BLUE}[INFO]${C_RESET} $1"; }
log_success() { echo -e "${C_GREEN}[OK]${C_RESET} $1"; }
log_warn()    { echo -e "${C_YELLOW}[WARN]${C_RESET} $1"; }
log_error()   { echo -e "${C_RED}[ERRO]${C_RESET} $1"; }

echo -e "${C_BOLD}${C_BLUE}══════════════════════════════════════════════════${C_RESET}"
echo -e "${C_BOLD}  🔑 Help Desk — Recuperação de Senha Admin${C_RESET}"
echo -e "${C_BOLD}${C_BLUE}══════════════════════════════════════════════════${C_RESET}"
echo ""

# ==========================================
# 1. DETECTAR DIRETÓRIO DO PROJETO
# ==========================================
APP_DIR="/var/www/help-desk"

# Se o script está sendo executado de dentro do projeto, usa o diretório atual
if [ -f "./package.json" ] && grep -q "help-desk" "./package.json" 2>/dev/null; then
    APP_DIR="$(pwd)"
elif [ -f "$APP_DIR/package.json" ]; then
    cd "$APP_DIR"
else
    log_error "Projeto não encontrado em $APP_DIR nem no diretório atual."
    log_error "Execute este script na raiz do projeto Help Desk."
    exit 1
fi

log_info "Diretório do projeto: ${C_BOLD}$APP_DIR${C_RESET}"

# ==========================================
# 2. VERIFICAR DEPENDÊNCIAS
# ==========================================
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

if [ ! -f ".env" ]; then
    log_error "Arquivo .env não encontrado. O sistema não está configurado."
    exit 1
fi

# Extração robusta da DATABASE_URL (suporta com ou sem aspas)
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | sed 's/^"//;s/"$//;s/^\x27//;s/\x27$//')

if [[ "$DB_URL" == postgresql* || "$DB_URL" == postgres* ]]; then
    PROVIDER="PostgreSQL"
    if [ ! -d "node_modules/pg" ]; then
        log_warn "Driver PostgreSQL (pg) não encontrado. Instalando..."
        npm install pg --save --silent
    fi
elif [[ "$DB_URL" == mysql* ]]; then
    PROVIDER="MySQL"
    if [ ! -d "node_modules/mysql2" ]; then
        log_warn "Driver MySQL (mysql2) não encontrado. Instalando..."
        npm install mysql2 --save --silent
    fi
else
    PROVIDER="SQLite"
    if [ ! -d "node_modules/better-sqlite3" ]; then
        log_warn "Driver SQLite (better-sqlite3) não encontrado. Instalando..."
        npm install better-sqlite3 --save --silent
    fi
fi

log_success "Banco detectado: ${C_BOLD}$PROVIDER${C_RESET}"
echo ""

# ==========================================
# 3. EXECUTAR SCRIPT DE RESET
# ==========================================
node scripts/reset-admin-password.js
