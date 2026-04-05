const { runBackup } = require("../src/lib/backupService");

async function main() {
    console.log("--- TESTE MANUAL DE BACKUP ---");
    try {
        await runBackup();
        console.log("Teste finalizado com sucesso. Verifique a pasta /backups e o log em /logs/backup.log");
    } catch (error) {
        console.error("Erro no teste de backup:", error);
    }
}

main();
