# 🚀 Help Desk Enterprise Platform

Bem-vindo à plataforma **Help Desk Enterprise**, uma solução robusta e resiliente para gestão de chamados e suporte. Este projeto foi desenvolvido com tecnologias de ponta e uma infraestrutura de segurança de nível industrial.

---

## 📖 Documentação Essencial
Para garantir o sucesso da sua implantação e operação, consulte nosso guia detalhado:

> [!TIP]
> **[Guia Completo de Deploy e Disaster Recovery](./docs/deploy.md)**
> (Clique aqui para ver como instalar, atualizar e recuperar o sistema)

---

## 🛠️ Tecnologias de Ponta

- **Framework**: [Next.js 16.2+](https://nextjs.org/) (Turbopack)
- **Engine de Dados**: [Prisma](https://www.prisma.io/) com suporte multi-banco:
  - **PostgreSQL** (Recomendado para Produção)
  - **MySQL** e **SQLite** (Suporte total).
- **Segurança**: Next-Auth (Middleware/Proxy), BcryptJS.
- **Real-time**: Estrutura otimizada para atualizações dinâmicas.

---

## 🛡️ Destaques da Infraestrutura

- **Backup Rotativo**: Snapshot automático diário com retenção de 7 dias. Protege Banco de Dados e Anexos.
- **Disaster Recovery (DR)**: Sistema de restauração "One-Click" integrado ao instalador.
- **Instalador Automático (`deploy.sh`)**: Orquestração completa de Nginx, SSL, Bancos de Dados e Node.js.
- **Modo de Manutenção**: Bloqueio global de segurança para atualizações críticas.

---

## 🏗️ Estrutura do Projeto

- `/backups`: Snapshots `.zip` de segurança (Ignorado pelo Git).
- `/docs`: Documentação técnica detalhada.
- `/logs`: Auditoria de processos e erros.
- `deploy.sh`: Script mestre de orquestração do servidor.

---

## 🚀 Primeiros Passos (Rápido)

1. Clone o repositório em seu servidor Linux.
2. Dê permissão: `chmod +x deploy.sh`.
3. Execute: `sudo ./deploy.sh`.
4. Escolha **[1] Nova Instalação** e siga as instruções na tela.

---
**Desenvolvido com foco em Estabilidade, Segurança e Continuidade.** 🚀
