/**
 * ===================================================
 * Help Desk — Recuperação de Senha de Administrador
 * ===================================================
 * 
 * Uso: node scripts/reset-admin-password.js
 * 
 * Suporte multi-banco:
 *   ✅ SQLite     (prisma/dev.db)
 *   ✅ PostgreSQL (postgresql://user:pass@host/db)
 *   ✅ MySQL      (mysql://user:pass@host/db)
 * 
 * Detecta o provider pelo DATABASE_URL do .env.
 * Resolve caminhos SQLite relativos à pasta prisma/,
 * seguindo o comportamento padrão do Prisma.
 * ===================================================
 */

const bcrypt = require("bcryptjs");
const readline = require("readline");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Cores para o terminal
const C_BOLD = "\x1b[1m";
const C_YELLOW = "\x1b[33m";
const C_RESET = "\x1b[0m";

// ==========================================
// 1. DETECÇÃO E RESOLUÇÃO DO BANCO
// ==========================================
const envPath = path.join(__dirname, "..", ".env");
let databaseUrl = "file:./dev.db";

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
    if (match) databaseUrl = match[1].trim();
}

function detectProvider(url) {
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) return "postgresql";
    if (url.startsWith("mysql://")) return "mysql";
    if (url.startsWith("file:")) return "sqlite";
    return "sqlite";
}

const provider = detectProvider(databaseUrl);

async function createAdapter() {
    if (provider === "sqlite") {
        const Database = require("better-sqlite3");
        // O Prisma resolve paths SQLite relativos ao arquivo schema.prisma (na pasta prisma/)
        let dbFile = databaseUrl.replace("file:", "").replace(/^\.\//, "");
        
        let absPath;
        if (path.isAbsolute(dbFile)) {
            absPath = dbFile;
        } else {
            // Tenta primeiro relativo à pasta prisma (padrão Prisma)
            const prismaRelPath = path.join(__dirname, "..", "prisma", dbFile);
            // Depois relativo ao root (fallback)
            const rootRelPath = path.join(__dirname, "..", dbFile);
            
            if (fs.existsSync(prismaRelPath)) {
                absPath = prismaRelPath;
            } else if (fs.existsSync(rootRelPath)) {
                absPath = rootRelPath;
            } else {
                absPath = prismaRelPath; // Default fallback
            }
        }

        if (!fs.existsSync(absPath)) {
            console.warn(`\n  ⚠️  Aviso: Banco SQLite não encontrado em ${absPath}.\n  Tentando encontrar o banco real...`);
        }

        const db = new Database(absPath);
        return {
            name: `SQLite (${path.basename(absPath)})`,
            query: (sql, params = []) => db.prepare(sql).all(...params),
            execute: (sql, params = []) => db.prepare(sql).run(...params),
            close: () => db.close(),
        };
    }

    if (provider === "postgresql") {
        const pg = require("pg");
        const client = new pg.Client({ connectionString: databaseUrl });
        await client.connect();
        return {
            name: `PostgreSQL (${new URL(databaseUrl).hostname})`,
            query: async (sql, params = []) => {
                let i = 0;
                const pgSql = sql.replace(/\?/g, () => `$${++i}`);
                const res = await client.query(pgSql, params);
                return res.rows;
            },
            execute: async (sql, params = []) => {
                let i = 0;
                const pgSql = sql.replace(/\?/g, () => `$${++i}`);
                await client.query(pgSql, params);
            },
            close: () => client.end(),
        };
    }

    if (provider === "mysql") {
        const mysql = require("mysql2/promise");
        const connection = await mysql.createConnection(databaseUrl);
        return {
            name: `MySQL (${new URL(databaseUrl).hostname})`,
            query: async (sql, params = []) => {
                const [rows] = await connection.execute(sql, params);
                return rows;
            },
            execute: async (sql, params = []) => {
                await connection.execute(sql, params);
            },
            close: () => connection.end(),
        };
    }
}

// ==========================================
// 2. HELPERS DE SQL
// ==========================================
function q(name) {
    if (provider === "postgresql") return `"${name}"`;
    if (provider === "mysql") return `\`${name}\``;
    return name;
}

// ==========================================
// 3. EXECUÇÃO
// ==========================================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (ans) => r(ans.trim())));

async function main() {
    console.log("\n══════════════════════════════════════════════════");
    console.log("  🔑 Help Desk — Recuperação de Senha Admin");
    console.log("══════════════════════════════════════════════════\n");

    const db = await createAdapter();
    console.log(`  📦 Banco detectado: ${db.name}`);
    console.log(`  🔗 Provider: ${provider}\n`);

    try {
        // Busca admins filtrando os campos que existirem
        const admins = await db.query(
            `SELECT id, name, email, role FROM ${q("User")} WHERE role = 'ADMIN' ORDER BY name`
        );

        if (!admins || admins.length === 0) {
            console.log("  ❌ Nenhum usuário ADMIN real encontrado no banco.");
            console.log("  Verifique se o seu DATABASE_URL está apontando para o banco certo.\n");
            process.exit(1);
        }

        console.log("  Administradores encontrados:\n");
        admins.forEach((admin, i) => {
            console.log(`    ${i + 1}) [${admin.id}] ${admin.name} (${admin.email || "Sem e-mail"})`);
        });

        console.log("");
        const choice = await ask("  Escolha o número do admin para resetar: ");
        const idx = parseInt(choice) - 1;

        if (isNaN(idx) || idx < 0 || idx >= admins.length) {
            console.log("\n  ❌ Opção inválida. Operação cancelada.\n");
            process.exit(1);
        }

        const selected = admins[idx];
        
        // Gera uma senha aleatória segura de 12 caracteres
        const randomPass = crypto.randomBytes(8).toString("hex").slice(0, 12);
        
        console.log(`\n  Selecionado: ${selected.name} (${selected.email || "Sem e-mail"})`);
        console.log(`  🔐 Senha Provisória Gerada: ${C_BOLD}${C_YELLOW}${randomPass}${C_RESET}`);
        console.log(`\n  ℹ️  O administrador será obrigado a trocar esta senha no primeiro acesso.`);

        const confirm = await ask(`\n  ⚠️  Confirma o reset de "${selected.name}" para esta nova senha? (s/n): `);
        if (confirm.toLowerCase() !== "s") {
            console.log("\n  Operação cancelada.\n");
            process.exit(0);
        }

        console.log("\n  ⚙️  Atualizando banco de dados...");
        const hash = await bcrypt.hash(randomPass, 10);

        // Atualiza as colunas que existirem (mustChangePassword e ativo)
        // Usamos try-catch para lidar com bancos em diferentes estágios de migração
        try {
            await db.execute(
                `UPDATE ${q("User")} SET ${q("password")} = ?, ${q("mustChangePassword")} = 1, ${q("ativo")} = 1 WHERE ${q("id")} = ?`,
                [hash, selected.id]
            );
        } catch (e) {
            // Fallback se as colunas extras não existirem
            await db.execute(
                `UPDATE ${q("User")} SET ${q("password")} = ? WHERE ${q("id")} = ?`,
                [hash, selected.id]
            );
        }

        // Auditoria
        try {
            const auditId = crypto.randomUUID();
            await db.execute(
                `INSERT INTO ${q("AuditLog")} (${q("id")}, ${q("acao")}, ${q("detalhes")}, ${q("userId")}, ${q("createdAt")}) VALUES (?, ?, ?, ?, ?)`,
                [auditId, "ADMIN_PASSWORD_RESET_CLI", `Senha resetada via terminal para o admin ${selected.name}`, selected.id, new Date().toISOString()]
            );
        } catch (e) {}

        console.log("\n  ✅ Senha resetada com sucesso!");
        console.log("══════════════════════════════════════════════════\n");

    } finally {
        await db.close();
        rl.close();
    }
}

main().catch(e => {
    console.error(`\n  ❌ Erro crítico: ${e.message}\n`);
    process.exit(1);
});
