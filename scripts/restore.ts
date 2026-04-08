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
const TEMP_RESTORE = path.join(process.cwd(), "temp_restore");

if (!BACKUP_ZIP) {
    console.error(`${RED}Erro: Você deve fornecer o caminho do arquivo .zip como argumento.${RESET}`);
    console.log("Exemplo: npm run restore backups/backup-arquivo.zip");
    process.exit(1);
}

function updateMaintenanceMode(enabled: boolean) {
    if (!fs.existsSync(ENV_PATH)) return;
    try {
        let content = fs.readFileSync(ENV_PATH, "utf8");
        const key = "NEXT_PUBLIC_MAINTENANCE_MODE";
        const value = enabled ? "true" : "false";
        if (content.includes(key)) {
            content = content.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
        } else {
            content += `\n${key}=${value}\n`;
        }
        fs.writeFileSync(ENV_PATH, content);
    } catch (e) {
        // Silencioso se falhar no fim
    }
}

async function executeRestoreLogic() {
    try {
        // 1. Modo de Manutenção
        console.log(`${YELLOW}[1/6] Ativando Modo de Manutenção...${RESET}`);
        updateMaintenanceMode(true);
        
        console.log(`${YELLOW}Aguardando 30 segundos para o servidor estabilizar...${RESET}`);
        for (let i = 30; i > 0; i--) {
            process.stdout.write(`\rReiniciando em ${i}s... `);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`\n${GREEN}Pronto! Iniciando restauração...${RESET}`);
        
        // 2. Extração
        console.log(`${YELLOW}[2/6] Descompactando backup...${RESET}`);
        if (!fs.existsSync(BACKUP_ZIP)) throw new Error("Arquivo ZIP não encontrado.");
        if (fs.existsSync(TEMP_RESTORE)) fs.rmSync(TEMP_RESTORE, { recursive: true, force: true });
        
        const zip = new AdmZip(BACKUP_ZIP);
        zip.extractAllTo(TEMP_RESTORE, true);

        // 3. Uploads
        console.log(`${YELLOW}[3/6] Restaurando anexos...${RESET}`);
        const UPLOADS_DIR = path.join(process.cwd(), "private_uploads");
        const TEMP_UPLOADS = path.join(TEMP_RESTORE, "uploads");
        if (fs.existsSync(TEMP_UPLOADS)) {
            if (fs.existsSync(UPLOADS_DIR)) fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
            fs.cpSync(TEMP_UPLOADS, UPLOADS_DIR, { recursive: true });
        }

        // 4. Banco de Dados
        console.log(`${YELLOW}[4/6] Restaurando Banco de Dados...${RESET}`);
        const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
        
        if (dbUrl.includes("postgresql://") || dbUrl.includes("postgres://")) {
            const sqlFile = path.join(TEMP_RESTORE, "database.sql");
            if (fs.existsSync(sqlFile)) {
                execSync(`psql "${dbUrl}" < "${sqlFile}"`, { stdio: "inherit" });
                console.log(`${GREEN}PostgreSQL restaurado.${RESET}`);
            }
        } else if (dbUrl.includes("mysql://")) {
            const sqlFile = path.join(TEMP_RESTORE, "database.sql");
            if (fs.existsSync(sqlFile)) {
                execSync(`mysql "${dbUrl}" < "${sqlFile}"`, { stdio: "inherit" });
                console.log(`${GREEN}MySQL restaurado.${RESET}`);
            }
        } else {
            // SQLite
            const dbPath = dbUrl.replace("file:", "");
            let dbAbsPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
            if (!fs.existsSync(path.dirname(dbAbsPath))) {
                const altPath = path.join(process.cwd(), "prisma", path.basename(dbPath));
                if (fs.existsSync(path.dirname(altPath))) dbAbsPath = altPath;
                else fs.mkdirSync(path.dirname(dbAbsPath), { recursive: true });
            }
            const tempDbFile = path.join(TEMP_RESTORE, "database.sqlite");
            if (fs.existsSync(tempDbFile)) {
                fs.copyFileSync(tempDbFile, dbAbsPath);
                console.log(`${GREEN}SQLite restaurado.${RESET}`);
            }
        }

        // 5. Configurações (.env)
        console.log(`${YELLOW}[5/6] Restaurando configurações...${RESET}`);
        const tempEnv = path.join(TEMP_RESTORE, ".env");
        if (fs.existsSync(tempEnv)) {
            fs.copyFileSync(tempEnv, ENV_PATH);
        }

        // 6. SSL
        console.log(`${YELLOW}[6/6] Restaurando certificados SSL (se aplicável)...${RESET}`);
        const tempSsl = path.join(TEMP_RESTORE, "ssl");
        if (fs.existsSync(tempSsl)) {
            const sslDest = process.platform === "linux" ? "/etc/letsencrypt" : "C:/certbot";
            try {
                if (!fs.existsSync(path.dirname(sslDest))) fs.mkdirSync(path.dirname(sslDest), { recursive: true });
                fs.cpSync(tempSsl, sslDest, { recursive: true });
                console.log(`${GREEN}SSL restaurado.${RESET}`);
            } catch (e) {
                console.warn(`${YELLOW}Aviso: Não foi possível restaurar SSL (permissão?).${RESET}`);
            }
        }

        // Finalização
        updateMaintenanceMode(false);
        if (fs.existsSync(TEMP_RESTORE)) fs.rmSync(TEMP_RESTORE, { recursive: true, force: true });
        console.log(`\n${GREEN}✅ RESTAURAÇÃO COMPLETADA COM SUCESSO!${RESET}\n`);
        process.exit(0);

    } catch (err: any) {
        console.error(`\n${RED}❌ ERRO FATAL: ${err.message}${RESET}`);
        updateMaintenanceMode(false);
        if (fs.existsSync(TEMP_RESTORE)) fs.rmSync(TEMP_RESTORE, { recursive: true, force: true });
        process.exit(1);
    }
}

async function main() {
    console.clear();
    console.log(`${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⚠️  PROCEDIMENTO DE RECUPERAÇÃO DE DESASTRES (UNIVERSAL)`);
    console.log(`Arquivo: ${BACKUP_ZIP}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Digite ${RED}CONFIRMAR${RESET} para sobrescrever os dados atuais: `, async (answer) => {
        rl.close();
        if (answer === "CONFIRMAR") {
            await executeRestoreLogic();
        } else {
            console.log(`${YELLOW}Operação cancelada.${RESET}`);
            process.exit(0);
        }
    });
}

main();
