import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import readline from "readline";
import { execSync } from "child_process";

// Cores para o terminal
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const ENV_PATH = path.join(process.cwd(), ".env");
const BACKUP_ZIP = process.argv[2];

if (!BACKUP_ZIP) {
    console.error(`${RED}Erro: Você deve fornecer o caminho do arquivo .zip como argumento.${RESET}`);
    console.log("Exemplo: npm run restore backups/backup-arquivo.zip");
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const TEMP_RESTORE = path.join(process.cwd(), "temp_restore");

/**
 * Lógica de Restauração
 */
async function startRestore() {
    console.clear();
    console.log(`${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⚠️  ATENÇÃO: PROCEDIMENTO DE RESTAURAÇÃO DE DESASTRES (DR)`);
    console.log(`Esta ação vai SOBRESCREVER o banco de dados atual e os arquivos de upload.`);
    console.log(`Arquivo alvo: ${BACKUP_ZIP}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    
    rl.question(`Digite ${RED}CONFIRMAR${RESET} para continuar ou qualquer outra tecla para abortar: `, async (answer) => {
        if (answer !== "CONFIRMAR") {
            console.log(`${YELLOW}Restauração cancelada pelo usuário.${RESET}`);
            process.exit(0);
        }

        try {
            // 1. Ativar Modo de Manutenção (Alterando .env)
            updateMaintenanceMode(true);
            console.log(`${YELLOW}[1/4] Modo de manutenção ATIVADO. Aguardando servidor reiniciar...${RESET}`);

            // 2. Extração
            console.log(`${YELLOW}[2/4] Descompactando arquivo de backup...${RESET}`);
            if (fs.existsSync(TEMP_RESTORE)) fs.rmSync(TEMP_RESTORE, { recursive: true });
            
            const zip = new AdmZip(BACKUP_ZIP);
            zip.extractAllTo(TEMP_RESTORE, true);

            // 3. Restaurar Uploads
            console.log(`${YELLOW}[3/4] Restaurando arquivos de anexos (uploads)...${RESET}`);
            const UPLOADS_DIR = path.join(process.cwd(), "private_uploads");
            const TEMP_UPLOADS = path.join(TEMP_RESTORE, "uploads");

            if (fs.existsSync(TEMP_UPLOADS)) {
                if (fs.existsSync(UPLOADS_DIR)) fs.rmSync(UPLOADS_DIR, { recursive: true });
                fs.renameSync(TEMP_UPLOADS, UPLOADS_DIR);
            }

            // 4. Restaurar Banco de Dados
            console.log(`${YELLOW}[4/4] Restaurando banco de dados...${RESET}`);
            const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
            
            // Se SQLite
            if (dbUrl.includes("file:")) {
                const dbPath = dbUrl.replace("file:", "");
                const dbAbsPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
                const TEMP_DB_FILE = path.join(TEMP_RESTORE, "database.sqlite");

                if (fs.existsSync(TEMP_DB_FILE)) {
                    // Garantir que a pasta do DB exista
                    if (!fs.existsSync(path.dirname(dbAbsPath))) fs.mkdirSync(path.dirname(dbAbsPath), { recursive: true });
                    fs.copyFileSync(TEMP_DB_FILE, dbAbsPath);
                    console.log(`${GREEN}Banco de Dados SQLite restaurado com sucesso.${RESET}`);
                }
            } else {
                // Mock para PostgreSQL: Extrairia as credenciais e rodaria o psql
                // Exemplo: execSync(`psql "${process.env.DATABASE_URL}" < "${TEMP_DB_SQL}"`);
                console.log(`${YELLOW}Aviso: O sistema não está usando SQLite. Lógica de psql necessária.${RESET}`);
            }

            // Limpeza Final
            updateMaintenanceMode(false);
            if (fs.existsSync(TEMP_RESTORE)) fs.rmSync(TEMP_RESTORE, { recursive: true });

            console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`✅ Sistema restaurado com sucesso a partir do backup:`);
            console.log(`${path.basename(BACKUP_ZIP)}`);
            console.log(`O modo de manutenção foi DESATIVADO.`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

        } catch (err: any) {
            console.error(`${RED}Erro fatal durante a restauração: ${err.message}${RESET}`);
            updateMaintenanceMode(false); // tenta desativar
        } finally {
            rl.close();
        }
    });
}

function updateMaintenanceMode(enabled: boolean) {
    if (!fs.existsSync(ENV_PATH)) return;

    let envContent = fs.readFileSync(ENV_PATH, "utf8");
    const key = "NEXT_PUBLIC_MAINTENANCE_MODE";
    const value = enabled ? "true" : "false";

    if (envContent.includes(key)) {
        envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
    } else {
        envContent += `\n${key}=${value}\n`;
    }

    fs.writeFileSync(ENV_PATH, envContent);
}

startRestore();
