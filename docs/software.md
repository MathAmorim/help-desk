# 📘 Documentação Técnica e Arquitetura de Software

Esta documentação detalha a engenharia, os módulos funcionais, a topologia de banco de dados e os fluxos de negócios que regem a plataforma **Help Desk Enterprise**.

---

## 🏗️ 1. Arquitetura Geral do Sistema

O sistema é construído sobre o ecossistema do **Next.js** em sua versão estável mais recente, utilizando a estrutura moderna de **App Router** (`src/app/`). A separação de responsabilidades é rígida, dividindo o processamento de servidor das interações interativas de cliente.

### A. Fluxo de Dados e Camadas
- **Camada de Apresentação (Client Components):** Interfaces de usuário enriquecidas com Tailwind CSS, focadas em responsividade, acessibilidade e micro-animações (como máscaras dinâmicas de input).
- **Camada de Negócio (Server Actions - `src/app/actions/`):** Lógica executada exclusivamente no lado do servidor, blindando conexões de banco e segredos de ambiente. Retorna respostas padronizadas `{ success: boolean, data?: any, error?: string }` para evitar o mascaramento de exceções em produção.
- **Camada de Persistência (Prisma ORM):** Abstração de banco de dados com suporte dinâmico a PostgreSQL, MySQL e SQLite.
- **Camada de Infraestrutura e Proxy (Nginx + PM2):** Balanceamento de carga, terminação SSL de borda, controle de vazamento de memória e orquestração de processos.

---

## 📂 2. Estrutura de Diretórios

```
help-desk/
├── docs/                      # Manuais, guias de deploy e arquitetura
├── prisma/                    # Esquema de modelagem Prisma e migrações
│   └── schema.prisma          # Arquivo mestre de definição de tabelas e tipos
├── public/                    # Ativos estáticos e pasta pública de uploads
├── src/
│   ├── app/                   # Roteamento baseado em arquivos (App Router)
│   │   ├── actions/           # Server Actions (Negócio no servidor)
│   │   │   ├── invites.ts     # Cadastro via convites de tokens
│   │   │   ├── profile.ts     # Gerenciamento de dados do perfil logado
│   │   │   ├── tickets.ts     # Ciclo de vida e regras de negócio de chamados
│   │   │   └── users.ts       # Controle administrativo de usuários
│   │   ├── api/               # APIs auxiliares e webhooks locais
│   │   ├── cadastro/          # Telas públicas de onboarding via convite
│   │   ├── dashboard/         # Portal autenticado (Admin, Técnico e Usuário)
│   │   └── login/             # Página de autenticação segura
│   ├── components/            # Componentes visuais reutilizáveis e modais
│   ├── lib/                   # Funções de suporte, clientes globais e helpers
│   │   ├── prisma.ts          # Singleton de conexão do banco de dados
│   │   └── utils.ts           # Máscaras de telefone, CPFs e normalizações
│   ├── auth.ts                # Inicialização de autenticação segura
│   └── middleware.ts          # Firewall lógico de rotas autenticadas
├── deploy.sh                  # Orquestrador mestre de instalação e patches
├── package.json               # Configurações de pacotes e scripts npm
└── tsconfig.json              # Regras de compilação estrita do TypeScript
```

---

## 💾 3. Esquema de Modelagem do Banco de Dados (`schema.prisma`)

As tabelas de persistência de dados modelam as relações corporativas e o ciclo de chamados. A seguir estão os modelos centrais:

### A. Usuário (`User`)
Armazena a identidade, credenciais criptografadas (`bcrypt`), o telefone validado obrigatório e o controle de permissão por perfis lógicos.
- **Campos Principais:**
  - `role`: Níveis de acesso (`ADMIN`, `TECNICO`, `USUARIO`).
  - `cpf` e `telefone`: Higienizados com dígitos puramente numéricos.
  - `searchVector`: String normalizada sem acentuações contendo nome, email, cpf e telefone para busca indexada de alta performance.

### B. Chamado (`Ticket`)
Entidade principal da operação que controla o andamento dos chamados abertos.
- **Campos Principais:**
  - `categoria`: Relacionada a tempos de SLA e prioridades recomendadas.
  - `status`: Estados controlados (`PENDENTE`, `AGUARDANDO`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO`).
  - `contatoOpcional`: Telefone do solicitante preenchido automaticamente, validado obrigatoriamente.
  - `vencimentoSLA`: Data calculada no servidor com base nas horas de resposta atribuídas à categoria escolhida.

### C. Registro de Auditoria (`AuditLog`)
Gravação cronológica e imutável para conformidade regulatória.
- **Campos Principais:**
  - `acao`: Eventos como `ABERTURA`, `ATRIBUICAO`, `MIGRACAO`, `CONCLUSAO`.
  - `userId` e `ticketId`: Relacionam o agente executor e o alvo.

---

## 🛠️ 4. Regras de Negócio Centrais

### A. Validação Estrutural de Telefones Brasileiros
Para evitar que números quebrados ou inválidos poluam o banco, o sistema valida a higienização de qualquer telefone enviado em formulários do cliente ou da API administrativa:
- **Restrição de Dígitos:** O valor limpo (somente dígitos) deve possuir **exatamente 10 ou 11 números** (DDD de 2 dígitos + telefone fixo de 8 dígitos ou celular de 9 dígitos).
- **Máscara Inteligente em Tempo Real:** Formata a saída no front-end de forma automática conforme a digitação:
  - Fixo: `(11) 3333-3333` (10 dígitos).
  - Celular: `(11) 9 9999-9999` (11 dígitos).

### B. Bloqueio Dinâmico na Abertura de Chamados
- Se um usuário não possui um número de telefone gravado no banco de dados, o formulário de abertura de chamados é substituído por um **Card informativo amber bloqueante**.
- O botão redireciona o usuário para as Configurações de Perfil, exigindo o preenchimento válido do telefone antes de qualquer interação operacional.
- Ao validar o telefone no perfil, a tela de abertura é liberada, preenchendo automaticamente o campo de contato obrigatório com o telefone cadastrado.

### C. Fluxo de Tratamento de Erros de Servidor (Server Actions)
Para blindar o sistema contra o encapsulamento de erros de produção do Next.js (onde erros lançados via `throw new Error()` viram códigos digests incompreensíveis para segurança do servidor), todas as interações de negócio retornam:
```typescript
try {
    // ... processamento lógico ...
    return { success: true, data: result };
} catch (error: any) {
    return { success: false, error: error.message || "Erro técnico interno." };
}
```
Isso permite que erros de validação (como CPF repetido, rate limit estourado ou senha fraca) sejam exibidos diretamente na tela do cliente com textos amigáveis.

---

## 🔒 5. Segurança da Informação

- **Criptografia de Senhas:** Hashes unilaterais fortes utilizando `bcryptjs` com salt factor de `10`.
- **Prevenção contra Flood (Rate Limit):** Validação de acessos consecutivos no lado do servidor para criação de tickets (máximo de 3 chamados por minuto por ID de usuário) para conter inundações maliciosas.
- **Firewall de Roteamento (Middleware):** Bloqueio absoluto de requisições a rotas administrativas e técnicas (`/dashboard/admin/*`, `/dashboard/todos`) de usuários com o perfil comum `USUARIO`.

---

## 🚀 6. Comandos e Manutenção em Desenvolvimento

Para rodar, migrar ou testar a aplicação em seu ambiente local:

```bash
# Instalar a árvore de pacotes NPM
npm install

# Gerar tipos e tipos estáticos do cliente Prisma
npx prisma generate

# Sincronizar o banco localmente de forma rápida
npx prisma db push

# Iniciar servidor local de desenvolvimento
npm run dev

# Compilar build de otimização de produção
npm run build
```

---
*Este documento é uma especificação técnica estável da arquitetura ativa do Help Desk Enterprise.* 🚀
