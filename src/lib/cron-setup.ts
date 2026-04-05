import cron from "node-cron";
import { runBackup } from "./backupService";

/**
 * Inicializa os agendamentos do sistema
 */
export function setupCronJobs() {
    console.log("[CRON] Inicializando agendador de tarefas...");

    // Agendar backup todos os dias às 03:00 da manhã
    // Formato: Minutos Horas DiaMes Mes DiaSemana
    cron.schedule("0 3 * * *", async () => {
        console.log("[CRON] Disparando tarefa de backup diária (03:00)...");
        await runBackup();
    });

    console.log("[CRON] Backup diário agendado com sucesso (03:00 AM).");
}
