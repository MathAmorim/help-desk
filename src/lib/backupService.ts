import fs from "fs";
import path from "path";
import archiver from "archiver";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
    log("Iniciando processo de backup automatizado (Universal DR)...");
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const backupFileName = `backup-${timestamp}.zip`;
    const finalPath = path.join(BACKUP_DIR, backupFileName);
    const tempDir = path.join(BACKUP_DIR, "temp");

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
        const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
        let dbBackupFile = "";

        // 1. Lógica Universal de Banco de Dados
        if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) {
            // PROGRESQL
            dbBackupFile = path.join(tempDir, "database.sql");
            log("Detectado PostgreSQL. Gerando dump...");
            
            let pgUri = dbUrl.split('?')[0];
            log("Detectado PostgreSQL. Gerando dump...");
            
            await execAsync(`pg_dump "${pgUri}" > "${dbBackupFile}"`);
            log("Dump PostgreSQL concluído.");
        } 
        else if (dbUrl.startsWith("mysql://")) {
            // MYSQL
            dbBackupFile = path.join(tempDir, "database.sql");
            let mysqlUri = dbUrl.split('?')[0];
            log("Detectado MySQL. Gerando dump...");
            
            await execAsync(`mysqldump "${mysqlUri}" > "${dbBackupFile}"`);
            log("Dump MySQL concluído.");
        }
        else {
            // SQLITE (Dev)
            dbBackupFile = path.join(tempDir, "database.sqlite");
            const dbPath = dbUrl.replace("file:", "");
            
            // Tenta localizar o banco (na raiz ou em /prisma)
            let dbAbsPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
            if (!fs.existsSync(dbAbsPath)) {
                const altPath = path.join(process.cwd(), "prisma", path.basename(dbPath));
                if (fs.existsSync(altPath)) dbAbsPath = altPath;
            }

            if (fs.existsSync(dbAbsPath)) {
                try {
                    // Usa o comando .backup do sqlite3 (evita travas de arquivo no Windows)
                    // Usamos aspas duplas para compatibilidade CLI Windows/Linux
                    await execAsync(`sqlite3 "${dbAbsPath}" ".backup '${dbBackupFile}'"`);
                    log("Snapshot SQLite criado via CLI.");
                } catch (err) {
                    fs.copyFileSync(dbAbsPath, dbBackupFile);
                    log("Cópia direta do SQLite realizada (CLI falhou ou ausente).");
                }
            } else {
                throw new Error(`Arquivo de banco de dados não localizado em: ${dbAbsPath}`);
            }
        }

        // 2. Criar o Pacote ZIP
        const output = fs.createWriteStream(finalPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(output);

        // a. Adicionar o dump/arquivo do BD
        if (fs.existsSync(dbBackupFile)) {
            archive.file(dbBackupFile, { name: path.basename(dbBackupFile) });
        }

        // b. Adicionar a pasta de Uploads
        if (fs.existsSync(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, "uploads");
            log("Pasta de uploads adicionada.");
        }

        // c. Adicionar .env
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
            archive.file(envPath, { name: ".env" });
        }

        // d. Adicionar Certificados SSL (se existirem)
        const SSL_PATHS = ["/etc/letsencrypt", "C:/certbot", path.join(process.cwd(), "ssl_mock")];
        for (const sPath of SSL_PATHS) {
            if (fs.existsSync(sPath)) {
                archive.directory(sPath, "ssl");
                log(`SSL (${sPath}) incluído.`);
                break;
            }
        }

        return new Promise((resolve, reject) => {
            output.on("close", () => {
                log(`Backup FINALIZADO: ${backupFileName} (${archive.pointer()} bytes)`);
                // Limpeza
                if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
                resolve(true);
            });

            archive.on("error", (err) => {
                log(`Erro no ZIP: ${err.message}`, true);
                reject(err);
            });

            archive.finalize();
        });

    } catch (error: any) {
        log(`Falha crítica: ${error.message}`, true);
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
        throw error;
    } finally {
        await rotateBackups();
    }
}

async function rotateBackups() {
    log("Limpando backups antigos...");
    if (!fs.existsSync(BACKUP_DIR)) return;
    
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    for (const file of files) {
        if (!file.endsWith(".zip")) continue;
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        if ((now - stats.mtimeMs) / msPerDay > RETENTION_DAYS) {
            fs.unlinkSync(filePath);
            log(`Removido por expiração: ${file}`);
        }
    }
}
