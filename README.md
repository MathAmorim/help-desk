# 🚀 Help Desk Enterprise Platform

Bem-vindo à plataforma **Help Desk Enterprise**, uma solução robusta e resiliente para gestão de chamados e suporte. Este projeto foi desenvolvido com tecnologias de ponta e uma infraestrutura de segurança de nível industrial.

---

## 🛠️ Tecnologias de Ponta

- **Framework**: [Next.js 16.2+](https://nextjs.org/) (Turbopack)
- **Engine de Dados**: [Prisma](https://www.prisma.io/) com suporte multi-banco:
  - **PostgreSQL** (Recomendado para Produção)
  - **MySQL**
  - **SQLite** (Ideal para Desenvolvimento)
- **Segurança**: Next-Auth (Middleware/Proxy), BcryptJS.
- **Real-time**: Estrutura otimizada para atualizações dinâmicas.

---

## 🛡️ Sistema de Disaster Recovery (DR)

A plataforma possui um sistema de continuidade de negócios automatizado e integrado.

### 1. Backups Automatizados e Rotativos
O sistema realiza backups automáticos e silenciosos que protegem:
- Toda a base de dados (PostgreSQL, MySQL ou SQLite).
- Todos os arquivos anexos (`private_uploads` e `public/uploads`).
- **Lógica de Rotação**: O sistema mantém apenas os últimos **7 dias** de backups, otimizando o espaço em disco automaticamente.

### 2. Restauração Manual (One-Click)
Em caso de falha humana ou necessidade de reverter dados:
```bash
npm run restore [CAMINHO_DO_BACKUP.zip]
```
> [!IMPORTANT]
> O processo de restauração ativa automaticamente o **Modo de Manutenção** e exige a palavra-chave `CONFIRMAR` para evitar perda acidental de dados.

---

## 🚢 Implantação e Atualização (deploy.sh)

A peça central da nossa infraestrutura é o script inteligente `deploy.sh`. Ele detecta o ambiente e oferece as seguintes opções:

### **Máquina Nova (Instalação Limpa)**
1. **Nova Instalação Limpa**: Configura todo o servidor (Nginx, SSL, Node, Banco) do zero.
2. **Importar Backup (DR)**: Prepara um servidor novo e já injeta os dados de um backup legado.

### **Máquina Existente (Update/Manutenção)**
1. **Update Seguro**: Atualiza o código via Git, recompila e mantém todos os dados e credenciais intactos.
2. **Reinstalação Forçada (Reset de Fábrica)**: Opção de último recurso. Limpa profundamente o FileSystem (`git clean -dfx`) e reinstala o sistema do zero com o código mais recente do GitHub.
3. **Restaurar Backup (DR)**: Seleciona um dos backups locais e o injeta sobre a instalação atual.

---

## 🚧 Modo de Manutenção

O sistema pode ser colocado em modo de manutenção global através do `.env`:
```env
NEXT_PUBLIC_MAINTENANCE_MODE="true"
```
Quando ativo, todos os usuários são redirecionados para uma página profissional de aviso, protegendo a integridade dos dados durante grandes mudanças.

---

## 📂 Estrutura do Projeto (Foco DR)

- `/backups`: Armazena os snapshots `.zip` (Ignorado pelo Git por segurança).
- `/logs`: Logs detalhados de backups e processos do sistema.
- `src/proxy.ts`: Middleware moderno (Next.js 16+) para controle de acesso e manutenção.
- `deploy.sh`: Script mestre de orquestração do servidor.

---

## 📝 Primeiros Passos

1. Clone o repositório.
2. Dê permissão ao script: `chmod +x deploy.sh`.
3. Execute: `sudo ./deploy.sh`.
4. Siga as instruções intuitivas na tela.

---
**Desenvolvido com foco em Estabilidade, Segurança e Continuidade.** 🚀
