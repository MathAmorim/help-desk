import cron from "node-cron";
import prisma from "./prisma";

export async function initCron() {
  console.log("[CRON] Inicializando serviço de agendamento SLA...");
  
  // Agendamento: 08:30 todos os dias
  // Para testes rápidos, você pode usar "* * * * *" (todo minuto)
  cron.schedule("30 8 * * *", async () => {
    const startTime = new Date();
    console.log(`[CRON] [${startTime.toISOString()}] Iniciando rotina matinal...`);
    
    try {
      await processSLA();
      await processAutoClose();
      console.log(`[CRON] Rotina finalizada em ${new Date().getTime() - startTime.getTime()}ms`);
    } catch (error) {
      console.error("[CRON] Falha Crítica na Rotina:", error);
    }
  });

  // Notificação de 1 dia de antecedência (Diário às 07:00)
  cron.schedule("0 7 * * *", async () => {
    try {
      await processDailyAppointmentReminders();
    } catch (e) {
      console.error("[CRON] Erro no reminder diário de agendamentos:", e);
    }
  });

  // Notificação de 30 minutos (A cada 10 minutos)
  cron.schedule("*/10 * * * *", async () => {
    try {
      await processImminentAppointmentReminders();
    } catch (e) {
      console.error("[CRON] Erro no reminder de agendamentos iminentes:", e);
    }
  });

  // Execução imediata de sanidade ao subir o servidor (opcional)
  // await processAutoClose(); 
}
async function processSLA() {
    // 1. Carregar configurações
    let settings = await prisma.setting.findUnique({ where: { id: "global" } });
    if (!settings) {
        settings = await prisma.setting.create({
            data: { id: "global", tempoMaximoAssuncao: 24, tempoMaximoConclusao: 72 }
        });
    }

    const agora = new Date();
    const limiteAssuncao = new Date(agora.getTime() - settings.tempoMaximoAssuncao * 60 * 60 * 1000);
    const limiteConclusao = new Date(agora.getTime() - settings.tempoMaximoConclusao * 60 * 60 * 1000);

    // 2. Buscar tickets ABERTOS atrasados (sem dataAssuncao e criados antes do limite)
    const ticketsNaoAssumidos = await prisma.ticket.findMany({
        where: {
            status: "ABERTO",
            dataAssuncao: null,
            createdAt: { lt: limiteAssuncao }
        }
    });

    // 3. Buscar tickets EM_ANDAMENTO atrasados (criados antes do limite de conclusão)
    const ticketsAtrasadosConclusao = await prisma.ticket.findMany({
        where: {
            status: "EM_ANDAMENTO",
            dataResolucao: null,
            createdAt: { lt: limiteConclusao }
        }
    });

    if (ticketsNaoAssumidos.length === 0 && ticketsAtrasadosConclusao.length === 0) return;

    // 4. Notificar todos os ADMINS
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    
    for (const admin of admins) {
        for (const t of ticketsNaoAssumidos) {
            await prisma.notification.create({
                data: {
                    mensagem: `⏳ SLA DE ASSUNÇÃO: O ticket #${t.id.slice(-4)} está aberto há mais de ${settings.tempoMaximoAssuncao}h sem técnico.`,
                    userId: admin.id,
                    ticketId: t.id,
                    link: `/dashboard/ticket/${t.id}`
                }
            });
        }
        for (const t of ticketsAtrasadosConclusao) {
            await prisma.notification.create({
                data: {
                    mensagem: `⏳ SLA DE RESOLUÇÃO: O ticket #${t.id.slice(-4)} está em atendimento há mais de ${settings.tempoMaximoConclusao}h.`,
                    userId: admin.id,
                    ticketId: t.id,
                    link: `/dashboard/ticket/${t.id}`
                }
            });
        }
    }
}

async function processAutoClose() {
    const cincoDiasAtras = new Date();
    cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);

    const ticketsParaFechar = await prisma.ticket.findMany({
        where: {
            status: "RESOLVIDO",
            dataResolucao: { lt: cincoDiasAtras }
        }
    });

    if (ticketsParaFechar.length === 0) return;

    // Tentar achar um Admin para ser o "autor" do comentário de sistema, ou deixar nulo se o schema permitir
    const systemAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const systemId = systemAdmin?.id;

    for (const t of ticketsParaFechar) {
        try {
            await prisma.$transaction(async (tx) => {
                await tx.ticket.update({
                    where: { id: t.id },
                    data: { status: "FECHADO", dataFechamento: new Date() }
                });

                if (systemId) {
                    await tx.comment.create({
                        data: {
                            texto: "🤖 **Ação de Sistema**: Este ticket foi encerrado automaticamente por inatividade técnica/do usuário após 5 dias da resolução.",
                            isInterno: false,
                            ticketId: t.id,
                            autorId: systemId
                        }
                    });
                }

                await tx.auditLog.create({
                    data: {
                        acao: "FECHAMENTO",
                        detalhes: "Auto-encerramento por política de SLA (5 dias de inatividade em RESOLVIDO).",
                        ticketId: t.id
                    }
                });
            });
        } catch (e) {
            console.error(`[CRON] Erro ao fechar ticket ${t.id}:`, e);
        }
    }
}

async function processDailyAppointmentReminders() {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
        where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { gte: tomorrowStart, lte: tomorrowEnd },
            notified1Day: false
        },
        include: { technicians: true }
    });

    if (appointments.length === 0) return;

    for (const app of appointments) {
        if (app.technicians.length === 0) continue;

        const timeStr = app.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        await prisma.$transaction(async (tx) => {
            // Criar notificações para cada técnico
            for (const tech of app.technicians) {
                await tx.notification.create({
                    data: {
                        mensagem: `📅 Lembrete: Você possui o serviço "${app.title}" amanhã às ${timeStr}.`,
                        userId: tech.id,
                        link: `/dashboard/agendamentos`
                    }
                });
            }

            // Marcar como notificado
            await tx.appointment.update({
                where: { id: app.id },
                data: { notified1Day: true }
            });
        });
    }
}

async function processImminentAppointmentReminders() {
    const now = new Date();
    const targetTime = new Date(now.getTime() + 40 * 60 * 1000); // Até 40 min no futuro
    const pastLimit = new Date(now.getTime() - 10 * 60 * 1000); // Até 10 min no passado

    const appointments = await prisma.appointment.findMany({
        where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { gt: pastLimit, lte: targetTime },
            notified30Min: false
        },
        include: { technicians: true }
    });

    if (appointments.length === 0) return;

    for (const app of appointments) {
        if (app.technicians.length === 0) continue;

        const timeStr = app.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        await prisma.$transaction(async (tx) => {
            for (const tech of app.technicians) {
                await tx.notification.create({
                    data: {
                        mensagem: `⏳ Atenção: O serviço "${app.title}" começará em breve (${timeStr})!`,
                        userId: tech.id,
                        link: `/dashboard/agendamentos`
                    }
                });
            }

            await tx.appointment.update({
                where: { id: app.id },
                data: { notified30Min: true }
            });
        });
    }
}
