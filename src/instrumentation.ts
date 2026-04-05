export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { setupCronJobs } = await import("./lib/cron-setup");
        setupCronJobs();
    }
}
