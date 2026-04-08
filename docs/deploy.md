# 🚀 Guia Mestre de Implantação e Disaster Recovery

Este guia detalha o funcionamento da infraestrutura do **Help Desk Enterprise** e como utilizar o script `deploy.sh` para gerenciar o ciclo de vida da aplicação.

---

## 🏗️ 1. Arquitetura de Deploy

A plataforma foi projetada para rodar em servidores **Linux (Debian/Ubuntu)**. O script `deploy.sh` automatiza 95% do processo, incluindo:
- Instalação do Node.js 20+ e PM2.
- Configuração de Nginx como Proxy Reverso.
- Provisionamento automático de **PostgreSQL** ou **MySQL**.
- Geração de segredos e variáveis de ambiente seguras.
- Otimização para Next.js 16 (Turbopack).

### Requisitos Mínimos
- Servidor Linux (VPS ou Bare Metal).
- Acesso Root ou `sudo`.
- Conectividade de rede (Portas 80 e 443 abertas no firewall).

---

## 🛠️ 2. O Script Inteligente (`deploy.sh`)

Não é necessário rodar `npm install` ou `prisma migrate` manualmente. O script detecta o estado do servidor e oferece caminhos dinâmicos:

### O Menu de Orquestração:

#### Para Instalações Novas:
1. **Nova Instalação Limpa**: Instala todas as dependências do SO, banco de dados e compila o projeto.
2. **Importar Backup (DR)**: Prepara o ambiente e solicita um arquivo `.zip` de backup para restaurar imediatamente no novo servidor.

#### Para Servidores Ativos:
1. **Update Seguro**: Faz o `git pull`, instala novas dependências e recompila o projeto sem apagar dados.
2. **Reinstalação Forçada (Reset de Fábrica)**: Remove todos os arquivos locais, limpa artefatos corrompidos e reinstala a versão mais recente do Git. Ideal para recuperação de desastres onde o disco está "sujo".
3. **Restaurar Backup (Disaster Recovery)**: Interrompe o site, ativa o Modo de Manutenção e sobrepõe os dados atuais com um backup de sua escolha.

---

## 🛡️ 3. Disaster Recovery e Segurança

### Backups Automáticos
O sistema possui um serviço interno que gera snapshots diários em `/backups`.
- **Conteúdo**: Banco de Dados (Dump SQL) + Arquivos Anexos (Uploads).
- **Retenção**: 7 dias (Backups antigos são deletados automaticamente).

### Modo de Manutenção
Sempre que uma operação crítica (como a restauração de backup) é realizada, o sistema ativa o bloqueio global.
- Para ativar manualmente: Altere `NEXT_PUBLIC_MAINTENANCE_MODE="true"` no seu `.env`.

---

## 🌐 4. Configurações de Rede (pfSense / Firewall)

Para garantir o acesso externo e segurança:

1. **NAT / Port Forward**: Redirecione as portas **80 (HTTP)** e **443 (HTTPS)** da sua WAN para o IP interno do servidor Help Desk.
2. **DNS Resolver**: Adicione um **Host Override** no pfSense para que o domínio (ex: `suporte.empresa.com.br`) aponte diretamente para o IP interno do servidor.
3. **SSL (Certbot)**: No servidor, após o deploy, execute:
   ```bash
   sudo certbot --nginx -d seu.dominio.com.br
   ```

---

## 📝 5. Manutenção Manual (CLI)

Se precisar interagir com o sistema sem o script:

| Comando | Função |
| :--- | :--- |
| `pm2 status` | Verifica se o app está rodando. |
| `pm2 logs help-desk` | Visualiza erros em tempo real. |
| `pm2 reload help-desk` | Reinicia o app sem quedas (Zero Downtime). |
| `npm run restore [ARQUIVO]` | Restaura um backup específico manualmente. |

---
**Importante**: Sempre mantenha o arquivo `deploy.sh` com permissão de execução: `chmod +x deploy.sh`.
