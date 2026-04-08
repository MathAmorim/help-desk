import { runBackup } from "../src/lib/backupService";

async function main() {
    try {
        await runBackup();
        console.log("Manual backup completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Manual backup failed:", error);
        process.exit(1);
    }
}

main();
