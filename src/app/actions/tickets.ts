"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkRateLimitUser } from "@/lib/rate-limit";
import { normalizeSearchText } from "@/lib/utils";

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

    // Rate Limit: Bloqueia IPs/Usuários que abrirem mais de 3 tickets em menos de 1 minuto (Spam flood).
    const isAllowed = checkRateLimitUser(session.user.id, "createTicket", 3, 60 * 1000);
    if (!isAllowed) {
        throw new Error("Você atingiu o limite de criação de chamados. Por favor, aguarde alguns instantes.");
    }

    const categoryRecord = await prisma.category.findUnique({
        where: { nome: data.categoria }
    });
    const prioridade = categoryRecord ? categoryRecord.prioridadePadrao : "BAIXA";

    if (data.titulo?.length > 150) throw new Error("Título não pode ter mais de 150 caracteres.");
    if (data.descricao?.length > 10000) throw new Error("Descrição excede 10.000 caracteres. Por favor, anexe um arquivo para logs muito extensos.");
    if (data.contatoOpcional && data.contatoOpcional.length > 150) throw new Error("Contato opcional excede 150 caracteres.");

    const cleanTitle = data.titulo.replace(/\0/g, "");
    const cleanDesc = data.descricao.replace(/\0/g, "");
    const cleanContato = data.contatoOpcional ? data.contatoOpcional.replace(/\0/g, "") : undefined;

    const ticket = await prisma.ticket.create({
        data: {
            titulo: cleanTitle,
            descricao: cleanDesc,
            categoria: data.categoria,
            prioridade,
            departamento: data.departamento,
            contatoOpcional: cleanContato,
            paraOutraPessoa: data.paraOutraPessoa,
            solicitanteId: session.user.id,
            searchVector: normalizeSearchText(`${cleanTitle} ${cleanDesc} ${data.departamento || ""} ${session.user.name || ""}`),
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
    atrasado?: boolean;
}

interface SLASettings {
    tempoMaximoAssuncao: number;
    tempoMaximoConclusao: number;
}

function buildWhereClause(baseWhere: any, filters?: TicketFilters, sla?: SLASettings) {
    const and: any[] = [{ ...baseWhere }];

    if (filters?.status && filters.status !== "TODOS") {
        and.push({ status: filters.status });
    }

    if (filters?.categoria && filters.categoria !== "TODOS") {
        and.push({ categoria: filters.categoria });
    }

    if (filters?.q) {
        const normalizedQ = normalizeSearchText(filters.q);
        and.push({
            OR: [
                { searchVector: { contains: normalizedQ } },
                { id: { contains: filters.q } } // ID mantém busca literal
            ]
        });
    }

    if (filters?.atrasado) {
        const now = new Date();
        const tAssuncao = sla?.tempoMaximoAssuncao ?? 24;
        const tConclusao = sla?.tempoMaximoConclusao ?? 72;

        const assuncaoCutoff = new Date(now.getTime() - tAssuncao * 60 * 60 * 1000);
        const conclusaoCutoff = new Date(now.getTime() - tConclusao * 60 * 60 * 1000);

        and.push({
            OR: [
                { status: "ABERTO", createdAt: { lt: assuncaoCutoff } },
                { status: { in: ["EM_ANDAMENTO", "AGUARDANDO_USUARIO"] }, createdAt: { lt: conclusaoCutoff } }
            ]
        });
    }

    return { AND: and };
}

export async function getMyTickets(filters?: TicketFilters) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Não autorizado");
    }

    let sla = undefined;
    if (filters?.atrasado) {
        const settings = await prisma.setting.findUnique({ where: { id: "global" } });
        if (settings) {
            sla = {
                tempoMaximoAssuncao: settings.tempoMaximoAssuncao,
                tempoMaximoConclusao: settings.tempoMaximoConclusao,
            };
        }
    }

    const where = buildWhereClause({ solicitanteId: session.user.id }, filters, sla);
    const normalizedQ = filters?.q ? normalizeSearchText(filters.q) : "";

    return prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            responsavel: {
                select: { name: true },
            },
            solicitante: {
                select: { name: true, role: true, funcao: true }
            }
        },
    });
}

export async function getAllTickets(filters?: TicketFilters) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "SUPORTE" && session.user.role !== "ADMIN")) {
        throw new Error("Não autorizado para ver todos os chamados");
    }

    let sla = undefined;
    if (filters?.atrasado) {
        const settings = await prisma.setting.findUnique({ where: { id: "global" } });
        if (settings) {
            sla = {
                tempoMaximoAssuncao: settings.tempoMaximoAssuncao,
                tempoMaximoConclusao: settings.tempoMaximoConclusao,
            };
        }
    }

    const where = buildWhereClause({}, filters, sla);

    return prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            solicitante: {
                select: { name: true, email: true, role: true, funcao: true },
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
            solicitante: { select: { name: true, email: true, role: true, funcao: true } },
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

    // Rate Limit: Restringe 10 comentários por minuto por usuário (Time-flooding protection)
    const isAllowed = checkRateLimitUser(session.user.id, "addComment", 10, 60 * 1000);
    if (!isAllowed) {
        throw new Error("Muitos comentários em um curto período. Aguarde um instante.");
    }

    if (texto?.length > 10000) {
        throw new Error("Comentário excede 10.000 caracteres. Por favor opte por anexar um arquivo para logs enormes.");
    }
    const cleanTexto = texto.replace(/\0/g, "");
    const resultComment = await prisma.$transaction(async (tx) => {
        const ticketState = await tx.ticket.findUnique({ 
            where: { id: ticketId }, 
            select: { status: true, responsavelId: true, solicitanteId: true } 
        });

        if (!ticketState) throw new Error("Chamado não encontrado");
        
        // Hardening: Verifica se o usuário tem permissão para comentar neste ticket (IDOR Protection)
        if (session.user.role === "USUARIO" && ticketState.solicitanteId !== session.user.id) {
            throw new Error("Acesso negado: Você só pode interagir com seus próprios chamados.");
        }

        // Guard: Ticket Morto. Ninguém pode comentar se estiver "FECHADO" (Terminado Permanente)
        if (ticketState.status === "FECHADO") {
            throw new Error("Ação Inválida: O ticket está FECHADO e arquivado definitivamente.");
        }

        // Lógica de Atribuição Automática:
        // Se o chamado NÃO tem responsável e quem comenta NÃO é um "USUARIO"
        if (!ticketState.responsavelId && session.user.role !== "USUARIO") {
            const updateTicketData: any = { responsavelId: session.user.id };
            // Se estiver "ABERTO", move para "EM_ANDAMENTO"
            if (ticketState.status === "ABERTO") {
                updateTicketData.status = "EM_ANDAMENTO";
                updateTicketData.dataAssuncao = new Date();
            }

            await tx.ticket.update({
                where: { id: ticketId },
                data: updateTicketData
            });

            await tx.auditLog.create({
                data: {
                    acao: "ATRIBUICAO",
                    detalhes: "Chamado auto-atribuído ao enviar interação.",
                    ticketId,
                    userId: session.user.id
                }
            });

            // Notifica o solicitante que o chamado foi assumido
            if (ticketState.solicitanteId !== session.user.id) {
                await tx.notification.create({
                    data: {
                        mensagem: `Seu chamado foi assumido pela equipe técnica.`,
                        link: `/dashboard/ticket/${ticketId}`,
                        userId: ticketState.solicitanteId,
                        ticketId: ticketId
                    }
                });
            }
        }

        // Se for marcado como solução, temos que garantir que o ticket não foi fechado correntemente por outra thread
        if (isSolucao && session.user.role !== "USUARIO") {
            if (ticketState.status === "RESOLVIDO") {
                throw new Error("Concorrência: Chamado já foi marcado como resolvido.");
            }
        }

        const comment = await tx.comment.create({
            data: {
                texto: cleanTexto,
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
            await tx.ticket.update({
                where: { id: ticketId },
                data: {
                    status: "RESOLVIDO",
                    dataResolucao: new Date(),
                    responsavelId: session.user.id 
                } as any
            });
            detalhesLog = "Chamado marcado como resolvido através de solução.";
        }

        await tx.auditLog.create({
            data: {
                acao: isSolucao ? "FECHAMENTO" : "COMENTARIO",
                detalhes: detalhesLog,
                ticketId,
                userId: session.user.id
            }
        });

        if (!isInterno && session.user.role !== "USUARIO") {
            if (ticketState.solicitanteId !== session.user.id) {
                await tx.notification.create({
                    data: {
                        mensagem: isSolucao 
                            ? `Seu chamado foi concluído! Por favor, avalie a qualidade do nosso suporte.` 
                            : `Novo comentário da equipe técnica no seu chamado...`,
                        link: `/dashboard/ticket/${ticketId}`,
                        userId: ticketState.solicitanteId,
                        ticketId: ticketId
                    }
                });
            }
        }

        return comment;
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    return resultComment;
}

export async function updateTicketStatus(ticketId: string, status: string, responsavelId?: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    const ticket = await prisma.$transaction(async (tx) => {
        const check = await tx.ticket.findUnique({ where: { id: ticketId } });
        if (!check) throw new Error("Chamado não encontrado");

        // Guard: Ticket Fechado (Morto). Se está fechado, não pode mudar de status. Só pode criar chamados vinculados novos.
        if (check.status === "FECHADO") {
            throw new Error("Transição Lógica Inválida: O ticket está arquivado e não pode sofrer mais alterações de estado.");
        }

        if (status === "RESOLVIDO" && check.status === "RESOLVIDO") {
            throw new Error("Concorrência: Chamado já foi resolvido/fechado");
        }

        let finalResponsavelId = responsavelId;
        if (status === "RESOLVIDO" && !check.responsavelId && !responsavelId) {
            finalResponsavelId = session.user.id;
        }

        const updateData: any = { status };
        let detalhes = `Status alterado para ${status}.`;

        if (finalResponsavelId) {
            updateData.responsavelId = finalResponsavelId;
            detalhes = `Chamado assumido e status alterado para ${status}.`;
        }

        if (status !== "ABERTO" && check.status === "ABERTO" && !(check as any).dataAssuncao) {
            updateData.dataAssuncao = new Date();
        }
        if (status === "RESOLVIDO") {
            updateData.dataResolucao = new Date();
        }

        const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: updateData
        });

        await tx.auditLog.create({
            data: {
                acao: finalResponsavelId ? "ATRIBUICAO" : "MUDANCA_STATUS",
                detalhes,
                ticketId,
                userId: session.user.id
            }
        });

        if (updatedTicket.solicitanteId !== session.user.id) {
            await tx.notification.create({
                data: {
                    mensagem: responsavelId
                        ? `Seu chamado foi assumido por um técnico e o status é ${status}.`
                        : status === "RESOLVIDO"
                            ? `Seu chamado foi concluído! Por favor, avalie a qualidade do nosso suporte.`
                            : `O status do seu chamado mudou para ${status}.`,
                    link: `/dashboard/ticket/${ticketId}`,
                    userId: updatedTicket.solicitanteId,
                    ticketId: ticketId
                }
            });
        }

        return updatedTicket;
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
    return ticket;
}

export async function updateTicketPriority(ticketId: string, prioridade: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    const check = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!check) throw new Error("Chamado não encontrado");
    if (check.status === "RESOLVIDO" || check.status === "FECHADO") {
        throw new Error("Transição Lógica Inválida: Não é possível modificar a prioridade de um ticket concluído.");
    }

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

    const check = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!check) throw new Error("Chamado não encontrado");
    if (check.status === "RESOLVIDO" || check.status === "FECHADO") {
        throw new Error("Transição Lógica Inválida: Não é possível modificar a categoria de um ticket concluído.");
    }

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

    const check = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!check) throw new Error("Chamado não encontrado");

    // Guard: Um chamado que evoluiu de RESOLVIDO para FECHADO é inalterável, não pode ser re-aberto nem pela moderação.
    if (check.status === "FECHADO") {
        throw new Error("Transição Lógica Inválida: Não é possível reabrir um ticket que já foi fechado permanentemente e arquivado.");
    }

    if (aceitar) {
        await prisma.ticket.update({
            where: { id: ticketId },
            data: { 
                status: "EM_ANDAMENTO", 
                aguardandoReabertura: false,
                dataResolucao: null // Resetar resolução ao reabrir
            } as any
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
        where: { 
            role: { in: ["SUPORTE", "ADMIN"] },
            ativo: true as any
        },
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

    if (ticket.status === "RESOLVIDO" || ticket.status === "FECHADO") {
        throw new Error("Chamado já está encerrado");
    }

    const t = await prisma.$transaction(async (tx) => {
        // Double check atomicamente
        const currentOp = await tx.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
        if (currentOp?.status === "RESOLVIDO" || currentOp?.status === "FECHADO") {
            throw new Error("Concorrência: Chamado já foi encerrado nesta fração de segundo");
        }

        const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: { 
                status: "RESOLVIDO", 
                encerradoPeloAutor: true,
                dataResolucao: new Date()
            } as any
        });

        await tx.auditLog.create({
            data: {
                acao: "FECHAMENTO",
                detalhes: "O próprio usuário solucionou/cancelou o chamado antecipadamente.",
                ticketId,
                userId: session.user.id
            }
        });

        await tx.comment.create({
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
            await tx.notification.create({
                data: {
                    mensagem: `O usuário encerrou/cancelou o chamado atuado por você.`,
                    link: `/dashboard/ticket/${ticketId}`,
                    userId: ticket.responsavelId,
                    ticketId: ticketId
                }
            });
        }

        return updatedTicket;
    });

    revalidatePath(`/dashboard/ticket/${ticketId}`);
    revalidatePath("/dashboard");
    return t;
}

export async function getSLASettings() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    // @ts-ignore - Prisma client maybe out of sync in this environment
    return prisma.setting.upsert({
        where: { id: "global" },
        update: {},
        create: {
            id: "global",
            tempoMaximoAssuncao: 24,
            tempoMaximoConclusao: 72
        }
    });
}

export async function updateSLASettings(data: { tempoMaximoAssuncao: number; tempoMaximoConclusao: number }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    // @ts-ignore - Prisma client maybe out of sync in this environment
    const settings = await prisma.setting.update({
        where: { id: "global" },
        data: {
            tempoMaximoAssuncao: data.tempoMaximoAssuncao,
            tempoMaximoConclusao: data.tempoMaximoConclusao
        }
    });

    revalidatePath("/dashboard/admin/sla");
    return settings;
}
