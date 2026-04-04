export async function register() {
  // O instrumentation Hook roda tanto na build quanto na runtime (Server).
  // Precisamos garantir que ele rode apenas no lado do servidor principal.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initCron } = await import("./lib/cron-service");
    await initCron();
  }
}
