"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------------------------
// AGENDAMENTOS E DISPONIBILIDADE
// ----------------------------------------------------------------------

export async function getAvailableTechnicians(startTimeStr: string, endTimeStr: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return { success: false, error: "Não autorizado", technicians: [] };

        const start = new Date(startTimeStr);
        const end = new Date(endTimeStr);

        // 1. Achar o Admin Principal (o usuário mais antigo)
        const mainAdmin = await prisma.user.findFirst({
            where: { role: "ADMIN" },
            orderBy: { createdAt: "asc" }
        });

        // 2. Buscar todos os técnicos e admins (exceto o Admin Principal)
        const allTechs = await prisma.user.findMany({
            where: {
                role: { in: ["ADMIN", "SUPORTE"] },
                ativo: true,
                id: mainAdmin ? { not: mainAdmin.id } : undefined
            },
            select: { id: true, name: true, role: true }
        });

        // 3. Buscar agendamentos conflitantes no período (sobreposição de horários)
        // Um agendamento conflita se o início dele for menor que o término desejado E
        // o término dele for maior que o início desejado.
        const conflictingAppointments = await prisma.appointment.findMany({
            where: {
                status: { notIn: ["CANCELLED", "COMPLETED"] },
                startTime: { lt: end },
                endTime: { gt: start }
            },
            include: { technicians: { select: { id: true } } }
        });

        // 4. Extrair IDs dos técnicos ocupados
        const busyTechIds = new Set<string>();
        conflictingAppointments.forEach(app => {
            app.technicians.forEach(t => busyTechIds.add(t.id));
        });

        // 5. Filtrar técnicos disponíveis
        const availableTechs = allTechs.filter(tech => !busyTechIds.has(tech.id));

        return { success: true, technicians: availableTechs };
    } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);
        return { success: false, error: "Erro ao buscar técnicos disponíveis.", technicians: [] };
    }
}

export async function createAppointment(data: { title: string, description?: string, location?: string, startTime: string, endTime: string, technicianIds: string[] }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
            return { success: false, error: "Não autorizado. Apenas técnicos e administradores podem agendar." };
        }

        const { title, description, location, startTime, endTime, technicianIds } = data;
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return { success: false, error: "A hora de término deve ser maior que a hora de início." };
        }

        // Validação de conflito no backend
        const conflictingAppointments = await prisma.appointment.findMany({
            where: {
                status: { notIn: ["CANCELLED", "COMPLETED"] },
                startTime: { lt: end },
                endTime: { gt: start },
                technicians: {
                    some: { id: { in: technicianIds } }
                }
            }
        });

        if (conflictingAppointments.length > 0) {
            return { success: false, error: "Um ou mais técnicos selecionados já possuem um agendamento neste horário." };
        }

        const appointment = await prisma.appointment.create({
            data: {
                title,
                description,
                location,
                startTime: start,
                endTime: end,
                userId: session.user.id,
                technicians: {
                    connect: technicianIds.map(id => ({ id }))
                }
            }
        });

        // Registrar Log de Auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "AGENDAMENTO_CRIADO",
                detalhes: `Agendamento '${title}' marcado para ${start.toLocaleString('pt-BR')} com ${technicianIds.length} técnico(s).`,
                userId: session.user.id
            }
        });

        // Notificação imediata para os técnicos escalados
        const timeStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = start.toLocaleDateString('pt-BR');
        
        for (const techId of technicianIds) {
            // Evitar notificar a si mesmo se o criador for alocado
            if (techId !== session.user.id) {
                await prisma.notification.create({
                    data: {
                        mensagem: `🚀 Novo Serviço: Você foi escalado para "${title}" no dia ${dateStr} às ${timeStr}.`,
                        userId: techId,
                        link: `/dashboard/agendamentos`
                    }
                });
            }
        }

        revalidatePath("/dashboard/agendamentos");
        revalidatePath("/dashboard"); // Atualiza dashboard principal que possa ter atalhos

        return { success: true, appointment };
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        return { success: false, error: "Ocorreu um erro ao realizar o agendamento." };
    }
}

export async function getAppointments(startDateStr?: string, endDateStr?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
            return { success: false, error: "Não autorizado", appointments: [] };
        }

        let whereClause: any = {};

        if (startDateStr && endDateStr) {
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            
            // Buscar agendamentos que interceptam o range
            whereClause = {
                OR: [
                    { startTime: { gte: start, lte: end } },
                    { endTime: { gte: start, lte: end } },
                    { startTime: { lte: start }, endTime: { gte: end } }
                ]
            };
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true } },
                technicians: { select: { id: true, name: true } }
            },
            orderBy: { startTime: "asc" }
        });

        return { success: true, appointments };
    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        return { success: false, error: "Erro ao carregar agendamentos.", appointments: [] };
    }
}

export async function updateAppointmentStatus(id: string, status: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
            return { success: false, error: "Não autorizado" };
        }

        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status },
            include: { technicians: true }
        });

        // Registrar Log de Auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "AGENDAMENTO_ATUALIZADO",
                detalhes: `Status do agendamento [${appointment.title}] alterado para ${status} por ${session.user.name}.`,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard/agendamentos");
        revalidatePath("/dashboard/relatorios"); // Recalcula total de chamados fechados

        return { success: true, appointment };
    } catch (error) {
        console.error("Erro ao atualizar agendamento:", error);
        return { success: false, error: "Erro técnico ao atualizar o status." };
    }
}
