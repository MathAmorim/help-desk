"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTicket(data: {
    titulo: string;
    descricao: string;
    categoria: string;
    departamento?: string;
    contatoOpcional?: string;
    paraOutraPessoa: boolean;
    attachmentIds?: string[];
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Não autorizado");
    }

    const categoryRecord = await prisma.category.findUnique({
        where: { nome: data.categoria }
    });
    const prioridade = categoryRecord ? categoryRecord.prioridadePadrao : "BAIXA";

    const ticket = await prisma.ticket.create({
        data: {
            titulo: data.titulo,
            descricao: data.descricao,
            categoria: data.categoria,
            prioridade,
            departamento: data.departamento,
            contatoOpcional: data.contatoOpcional,
            paraOutraPessoa: data.paraOutraPessoa,
            solicitanteId: session.user.id,
            attachments: data.attachmentIds && data.attachmentIds.length > 0 ? {
                connect: data.attachmentIds.map(id => ({ id }))
            } : undefined
        },
    });

    await prisma.auditLog.create({
        data: {
            acao: "ABERTURA",
            detalhes: "Chamado aberto pelo usuário.",
            ticketId: ticket.id,
            userId: session.user.id,
        },
    });

    revalidatePath("/dashboard");
    return ticket;
}

export interface TicketFilters {
    q?: string;
    status?: string;
    categoria?: string;
}

function buildWhereClause(baseWhere: any, filters?: TicketFilters) {
    const where = { ...baseWhere };
    if (filters?.status && filters.status !== "TODOS") {
        where.status = filters.status;
    }
    if (filters?.categoria && filters.categoria !== "TODOS") {
        where.categoria = filters.categoria;
    }
    if (filters?.q) {
        where.OR = [
            { titulo: { contains: filters.q } },
            { descricao: { contains: filters.q } },
            { id: { contains: filters.q } },
            { solicitante: { name: { contains: filters.q } } },
            { responsavel: { name: { contains: filters.q } } }
        ];
    }
    return where;
}

export async function getMyTickets(filters?: TicketFilters) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Não autorizado");
    }

    const where = buildWhereClause({ solicitanteId: session.user.id }, filters);

    return prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            responsavel: {
                select: { name: true },
            },
            solicitante: {
                select: { name: true }
            }
        },
    });
}

export async function getAllTickets(filters?: TicketFilters) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "SUPORTE" && session.user.role !== "ADMIN")) {
        throw new Error("Não autorizado para ver todos os chamados");
    }

    const where = buildWhereClause({}, filters);

    return prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            solicitante: {
                select: { name: true, email: true },
            },
            responsavel: {
                select: { name: true },
            },
        },
    });
}

export async function getTicketById(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            solicitante: { select: { name: true, email: true } },
            responsavel: { select: { name: true } },
            attachments: true,
            comments: {
                include: {
                    autor: { select: { name: true, role: true } },
                    attachments: true
                },
                orderBy: { createdAt: "asc" }
            },
            tecnicosSecundarios: {
                select: { id: true, name: true, role: true }
            },
            auditLogs: {
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: "asc" }
            }
        }
    });

    if (!ticket) return null;

    if (session.user.role === "USUARIO" && ticket.solicitanteId !== session.user.id) {
        return null;
    }

    if (session.user.role === "USUARIO") {
        const t = ticket as any;
        return {
            ...t,
            comments: t.comments.filter((c: any) => !c.isInterno),
            auditLogs: []
        } as any;
    }

    return ticket;
}

export async function addComment(ticketId: string, texto: string, isInterno: boolean, attachmentIds?: string[], isSolucao?: boolean) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    if (session.user.role === "USUARIO" && isInterno) {
        throw new Error("Usuários não podem criar notas internas");
    }

    const comment = await prisma.comment.create({
        data: {
            texto,
            isInterno,
            isSolucao: isSolucao || false,
            ticketId,
            autorId: session.user.id,
            attachments: attachmentIds && attachmentIds.length > 0 ? {
                connect: attachmentIds.map(id => ({ id }))
            } : undefined
        } as any
    });

    let detalhesLog = isInterno ? "Nota interna adicionada." : "Comentário público adicionado.";

    if (isSolucao && session.user.role !== "USUARIO") {
        const check = await prisma.ticket.findUnique({ where: { id: ticketId } });
        const updateData: any = { status: "RESOLVIDO" };
        if (!check?.responsavelId) {
            updateData.responsavelId = session.user.id;
        }

        await prisma.ticket.update({
            where: { id: ticketId },
            data: updateData
        });
        detalhesLog = updateData.responsavelId
            ? "Chamado auto-atribuído e marcado como resolvido através de solução."
            : "Chamado marcado como resolvido através de solução.";
    }

    await prisma.auditLog.create({
        data: {
            acao: isSolucao ? "FECHAMENTO" : "COMENTARIO",
            detalhes: detalhesLog,
            ticketId,
            userId: session.user.id
        }
    });

    if (!isInterno && session.user.role !== "USUARIO") {
        const t = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { solicitanteId: true } });
        if (t && t.solicitanteId !== session.user.id) {
            await prisma.notification.create({
                data: {
                    mensagem: isSolucao ? `Seu chamado foi concluído! Por favor, avalie a qualidade do nosso suporte.` : `Novo comentário da equipe técnica no seu chamado...`,
                    link: `/dashboard/ticket/${ticketId}`,
                    userId: t.solicitanteId,
                    ticketId: ticketId
                }
            });
        }
    }

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    return comment;
}

export async function updateTicketStatus(ticketId: string, status: string, responsavelId?: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    let finalResponsavelId = responsavelId;

    if (status === "RESOLVIDO") {
        const check = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!check?.responsavelId && !responsavelId) {
            finalResponsavelId = session.user.id;
        }
    }

    const updateData: any = { status };
    let detalhes = `Status alterado para ${status}.`;

    if (finalResponsavelId) {
        updateData.responsavelId = finalResponsavelId;
        detalhes = `Chamado assumido e status alterado para ${status}.`;
    }

    const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData
    });

    await prisma.auditLog.create({
        data: {
            acao: finalResponsavelId ? "ATRIBUICAO" : "MUDANCA_STATUS",
            detalhes,
            ticketId,
            userId: session.user.id
        }
    });

    if (ticket.solicitanteId !== session.user.id) {
        await prisma.notification.create({
            data: {
                mensagem: responsavelId
                    ? `Seu chamado foi assumido por um técnico e o status é ${status}.`
                    : status === "RESOLVIDO"
                        ? `Seu chamado foi concluído! Por favor, avalie a qualidade do nosso suporte.`
                        : `O status do seu chamado mudou para ${status}.`,
                link: `/dashboard/ticket/${ticketId}`,
                userId: ticket.solicitanteId,
                ticketId: ticketId
            }
        });
    }

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
    return ticket;
}

export async function updateTicketPriority(ticketId: string, prioridade: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { prioridade }
    });

    await prisma.auditLog.create({
        data: {
            acao: "MUDANCA_STATUS",
            detalhes: `Prioridade realinhada manualmente para ${prioridade}.`,
            ticketId,
            userId: session.user.id
        }
    });

    if (ticket.solicitanteId !== session.user.id) {
        await prisma.notification.create({
            data: {
                mensagem: `A prioridade do seu chamado foi atualizada para ${prioridade}.`,
                link: `/dashboard/ticket/${ticketId}`,
                userId: ticket.solicitanteId,
                ticketId: ticketId
            }
        });
    }

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
    return ticket;
}

export async function updateTicketCategory(ticketId: string, categoria: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { categoria }
    });

    await prisma.auditLog.create({
        data: {
            acao: "MUDANCA_STATUS",
            detalhes: `Categoria realinhada manualmente para ${categoria}.`,
            ticketId,
            userId: session.user.id
        }
    });

    if (ticket.solicitanteId !== session.user.id) {
        await prisma.notification.create({
            data: {
                mensagem: `A categoria do seu chamado foi atualizada para ${categoria}.`,
                link: `/dashboard/ticket/${ticketId}`,
                userId: ticket.solicitanteId,
                ticketId: ticketId
            }
        });
    }

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
    return ticket;
}

export async function solicitarReabertura(ticketId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.status !== "RESOLVIDO") throw new Error("Chamado não pode ser reaberto.");

    if (session.user.role === "USUARIO" && ticket.solicitanteId !== session.user.id) {
        throw new Error("Acesso negado");
    }

    await prisma.ticket.update({
        where: { id: ticketId },
        data: { aguardandoReabertura: true }
    });

    await prisma.comment.create({
        data: {
            texto: "🚨 O usuário solicitou a reabertura deste chamado.",
            isInterno: false,
            ticketId,
            autorId: session.user.id
        }
    });

    await prisma.auditLog.create({
        data: {
            acao: "COMENTARIO",
            detalhes: "Solicitação de reabertura registrada pelo usuário.",
            ticketId,
            userId: session.user.id
        }
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
}

export async function avaliarReabertura(ticketId: string, aceitar: boolean) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    if (aceitar) {
        await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "EM_ANDAMENTO", aguardandoReabertura: false }
        });
        await prisma.comment.create({
            data: { texto: "✅ A solicitação de reabertura foi ACEITA pela equipe de suporte. O chamado encontra-se Em Andamento novamente.", isInterno: false, ticketId, autorId: session.user.id }
        });
        await prisma.auditLog.create({
            data: { acao: "MUDANCA_STATUS", detalhes: "Reabertura Aceita. Status alterado para EM_ANDAMENTO.", ticketId, userId: session.user.id }
        });
    } else {
        await prisma.ticket.update({
            where: { id: ticketId },
            data: { aguardandoReabertura: false }
        });
        await prisma.comment.create({
            data: { texto: "❌ A solicitação de reabertura foi recusada pela equipe de suporte. O status permanece fechado.", isInterno: false, ticketId, autorId: session.user.id }
        });
        await prisma.auditLog.create({
            data: { acao: "COMENTARIO", detalhes: "Reabertura Recusada. Chamado segue RESOLVIDO.", ticketId, userId: session.user.id }
        });
    }

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
}

export async function avaliarChamado(ticketId: string, nota: number, comentario?: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) throw new Error("Chamado não encontrado.");
    if (ticket.status !== "RESOLVIDO") throw new Error("Apenas chamados resolvidos podem ser avaliados.");
    if (ticket.solicitanteId !== session.user.id) throw new Error("Apenas o autor pode avaliar o atendimento.");
    if (ticket.notaAvaliacao) throw new Error("Este chamado já foi avaliado.");

    await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            notaAvaliacao: nota,
            comentarioAvaliacao: comentario
        }
    });

    await prisma.auditLog.create({
        data: {
            acao: "COMENTARIO",
            detalhes: `O usuário avaliou o atendimento com ${nota} estrela(s).`,
            ticketId,
            userId: session.user.id
        }
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
}

export async function getAvailableTechnicians() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    return prisma.user.findMany({
        where: { role: { in: ["SUPORTE", "ADMIN"] } },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: "asc" }
    });
}

export async function vincularTecnicoSecundario(ticketId: string, tecnicoId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    const tecnico = await prisma.user.findUnique({ where: { id: tecnicoId } });
    if (!tecnico) throw new Error("Técnico não encontrado.");

    await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            tecnicosSecundarios: {
                connect: { id: tecnicoId }
            }
        }
    });

    await prisma.auditLog.create({
        data: {
            acao: "ATRIBUICAO",
            detalhes: `Técnico de apoio vinculado: ${tecnico.name}`,
            ticketId,
            userId: session.user.id
        }
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
}

export async function desvincularTecnicoSecundario(ticketId: string, tecnicoId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    const tecnico = await prisma.user.findUnique({ where: { id: tecnicoId } });
    if (!tecnico) throw new Error("Técnico não encontrado.");

    await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            tecnicosSecundarios: {
                disconnect: { id: tecnicoId }
            }
        }
    });

    await prisma.auditLog.create({
        data: {
            acao: "ATRIBUICAO",
            detalhes: `Técnico de apoio desvinculado: ${tecnico.name}`,
            ticketId,
            userId: session.user.id
        }
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
}

export async function encerrarChamadoUsuario(ticketId: string, motivo?: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "USUARIO") throw new Error("Não autorizado");

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Chamado não encontrado");
    if (ticket.solicitanteId !== session.user.id) throw new Error("Acesso negado");

    const t = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "RESOLVIDO", encerradoPeloAutor: true } as any
    });

    await prisma.auditLog.create({
        data: {
            acao: "FECHAMENTO",
            detalhes: "O próprio usuário solucionou/cancelou o chamado antecipadamente.",
            ticketId,
            userId: session.user.id
        }
    });

    await prisma.comment.create({
        data: {
            texto: motivo && motivo.trim().length > 0
                ? `🛑 O autor encerrou o chamado via autoatendimento com a seguinte tratativa:\n\n${motivo}`
                : "🛑 O autor do chamado encerrou ou cancelou este ticket via autoatendimento.",
            isInterno: false,
            isSolucao: true,
            ticketId,
            autorId: session.user.id
        } as any
    });

    if (ticket.responsavelId) {
        await prisma.notification.create({
            data: {
                mensagem: `O usuário encerrou/cancelou o chamado atuado por você.`,
                link: `/dashboard/ticket/${ticketId}`,
                userId: ticket.responsavelId,
                ticketId: ticketId
            }
        });
    }

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
    return t;
}
