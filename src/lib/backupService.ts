import fs from "fs";
import path from "path";
import archiver from "archiver";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Configurações
const BACKUP_DIR = path.join(process.cwd(), "backups");
const UPLOADS_DIR = path.join(process.cwd(), "private_uploads");
const LOG_FILE = path.join(process.cwd(), "logs", "backup.log");
const RETENTION_DAYS = 7;

// Garante que as pastas existam
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function log(message: string, isError = false) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${isError ? "ERROR: " : "INFO: "}${message}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(entry.trim());
}

/**
 * Realiza o backup do Banco de Dados e Anexos
 */
export async function runBackup() {
    log("Iniciando processo de backup automatizado...");
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const backupFileName = `backup-${timestamp}.zip`;
    const finalPath = path.join(BACKUP_DIR, backupFileName);
    const tempDir = path.join(BACKUP_DIR, "temp");

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
        // 1. Backup do Banco de Dados (SQLite)
        // Se fosse PostgreSQL, usaríamos pg_dump aqui.
        // Para SQLite, faremos uma cópia segura ou dump via CLI se disponível.
        const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./dev.db";
        const dbAbsPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
        const dbBackupPath = path.join(tempDir, "database.sqlite.bak");

        if (fs.existsSync(dbAbsPath)) {
            // Tenta usar o comando .backup do sqlite3 se disponível para consistência total
            try {
                await execFileAsync("sqlite3", [dbAbsPath, `.backup '${dbBackupPath}'`]);
                log("Snapshot do banco de dados (SQLite) criado com sucesso via CLI.");
            } catch (err) {
                // Fallback para cópia direta se sqlite3 não estiver no PATH
                fs.copyFileSync(dbAbsPath, dbBackupPath);
                log("Cópia direta do banco de dados realizada (sqlite3 CLI não encontrado).");
            }
        } else {
            log(`Arquivo de banco de dados não encontrado em: ${dbAbsPath}`, true);
        }

        // 2. Preparar o Arquivo ZIP
        const output = fs.createWriteStream(finalPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(output);

        // a. Adicionar o dump do BD
        if (fs.existsSync(dbBackupPath)) {
            archive.file(dbBackupPath, { name: "database.sqlite" });
        }

        // b. Adicionar a pasta de Uploads
        if (fs.existsSync(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, "uploads");
            log(`Pasta de uploads (${UPLOADS_DIR}) adicionada ao pacote.`);
        } else {
            log("Pasta de uploads não encontrada ou vazia.", true);
        }

        // 3. Adicionar arquivo .env (Vital para DR)
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
            archive.file(envPath, { name: ".env" });
            log("Arquivo .env adicionado ao pacote.");
        }

        // 4. Adicionar Certificados SSL (Locais padrão ou Mock de teste)
        const SSL_PATHS = ["/etc/letsencrypt", "C:/certbot", path.join(process.cwd(), "ssl_mock")];
        for (const sslPath of SSL_PATHS) {
            if (fs.existsSync(sslPath)) {
                archive.directory(sslPath, "ssl");
                log(`Pasta de certificados SSL encontrada em ${sslPath} e adicionada ao pacote.`);
                break;
            }
        }

        return new Promise((resolve, reject) => {
            output.on("close", () => {
                log(`Backup finalizado com sucesso: ${backupFileName} (${archive.pointer()} bytes)`);
                // Limpa o temporário
                if (fs.existsSync(dbBackupPath)) fs.unlinkSync(dbBackupPath);
                resolve(true);
            });

            archive.on("error", (err) => {
                log(`Erro no archive: ${err.message}`, true);
                reject(err);
            });

            archive.finalize();
        });

    } catch (error: any) {
        log(`Falha crítica no backup: ${error.message}`, true);
    } finally {
        // 3. Rotação (Deletar antigos)
        await rotateBackups();
    }
}

/**
 * Remove backups com mais de 7 dias
 */
async function rotateBackups() {
    log("Verificando retenção de backups antigos...");
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    for (const file of files) {
        if (!file.endsWith(".zip")) continue;

        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (now - stats.mtimeMs) / msPerDay;

        if (ageInDays > RETENTION_DAYS) {
            fs.unlinkSync(filePath);
            log(`Backup antigo removido por retenção (>7 dias): ${file}`);
        }
    }
}
