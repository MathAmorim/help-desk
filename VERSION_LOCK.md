# Bloqueio de Versões de Sistema (DO NOT EDIT)

Este arquivo documenta as versões exatas de dependências críticas do sistema que foram homologadas para funcionar em conjunto no servidor de produção.

## ⚠️ AVISO PARA DESENVOLVEDORES E AI AGENTS ⚠️
**NÃO ALTERE, NÃO ATUALIZE E NÃO MODIFIQUE** as versões destas bibliotecas no `package.json` sem ordens explícitas e claras do administrador do sistema.

### Dependências Homologadas:
- **`next`**: `15.0.0`
  *(Motivo: Versões 16+ impõem regras estritas de módulo ES e Turbopack padrão que quebram a resolução de módulos legados do next-auth v4).*
- **`next-auth`**: `4.24.13`
  *(Motivo: O sistema inteiro depende da API v4 `getServerSession`. A atualização para v5 (Auth.js) é uma "Breaking Change" massiva e exige refatoração completa do projeto).*
- **`react`** & **`react-dom`**: `19.2.3`
  *(Motivo: Suporte a `useFormStatus` e Server Actions introduzidos na aplicação).*

### Histórico de Resolução de Problemas
No dia 24 de Abril de 2026, o servidor de produção apresentou falhas críticas de compilação (`Package path ./react is not exported`) devido à atualização automática/involuntária para a versão Canary/Edge do Next.js 16. O sistema foi intencionalmente submetido a um downgrade estabilizador para o Next.js 15.0.0, que restaura o compilador Webpack flexível e a compatibilidade total com o `next-auth` v4, sem perder o suporte ao React 19.
