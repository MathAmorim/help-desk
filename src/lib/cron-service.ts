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
