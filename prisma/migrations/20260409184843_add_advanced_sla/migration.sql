-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "prioridadePadrao" TEXT NOT NULL DEFAULT 'BAIXA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "placeholder" TEXT,
    "tempoResolucao" INTEGER NOT NULL DEFAULT 72,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Category" ("ativo", "createdAt", "id", "nome", "placeholder", "prioridadePadrao", "updatedAt") SELECT "ativo", "createdAt", "id", "nome", "placeholder", "prioridadePadrao", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_nome_key" ON "Category"("nome");
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "prioridade" TEXT NOT NULL DEFAULT 'BAIXA',
    "departamento" TEXT,
    "contatoOpcional" TEXT,
    "paraOutraPessoa" BOOLEAN NOT NULL DEFAULT false,
    "aguardandoReabertura" BOOLEAN NOT NULL DEFAULT false,
    "encerradoPeloAutor" BOOLEAN NOT NULL DEFAULT false,
    "solicitanteId" TEXT NOT NULL,
    "responsavelId" TEXT,
    "notaAvaliacao" INTEGER,
    "comentarioAvaliacao" TEXT,
    "dataAssuncao" DATETIME,
    "dataResolucao" DATETIME,
    "dataFechamento" DATETIME,
    "vencimentoSLA" DATETIME,
    "ultimoPausa" DATETIME,
    "totalPausado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "searchVector" TEXT,
    CONSTRAINT "Ticket_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("aguardandoReabertura", "categoria", "comentarioAvaliacao", "contatoOpcional", "createdAt", "dataAssuncao", "dataFechamento", "dataResolucao", "departamento", "descricao", "encerradoPeloAutor", "id", "notaAvaliacao", "paraOutraPessoa", "prioridade", "responsavelId", "searchVector", "solicitanteId", "status", "titulo", "updatedAt") SELECT "aguardandoReabertura", "categoria", "comentarioAvaliacao", "contatoOpcional", "createdAt", "dataAssuncao", "dataFechamento", "dataResolucao", "departamento", "descricao", "encerradoPeloAutor", "id", "notaAvaliacao", "paraOutraPessoa", "prioridade", "responsavelId", "searchVector", "solicitanteId", "status", "titulo", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
