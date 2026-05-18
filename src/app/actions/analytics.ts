"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";


export async function getDashboardMetrics(periodo: string) {
    const session = await auth();
    if (!session || !session.user || session.user.role === "USUARIO") throw new Error("Não autorizado");

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (periodo === 'hoje') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodo === 'semana') {
        const firstDay = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), firstDay);
    } else if (periodo === 'mes') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodo === 'ano') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (periodo.match(/^\d{4}-\d{2}$/)) { // YYYY-MM
        const [year, month] = periodo.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const createdAtFilter: any = {};
    if (startDate) createdAtFilter.gte = startDate;
    if (endDate) createdAtFilter.lte = endDate;

    const whereClauseObj = Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {};

    // Total Criados (Tudo no período)
    const totalCriados = await prisma.ticket.count({
        where: whereClauseObj
    });

    // Total Abertos (Ainda pendentes de todos gerados no período)
    const totalAbertos = await prisma.ticket.count({
        where: {
            ...whereClauseObj,
            status: { not: "RESOLVIDO" }
        }
    });

    // Agendamentos Concluídos no período
    const completedAppointments = await prisma.appointment.findMany({
        where: {
            createdAt: createdAtFilter,
            status: "COMPLETED"
        },
        include: {
            technicians: { select: { id: true } }
        }
    });

    // Total Resolvidos (Resolvidos no periodo + Agendamentos Concluídos)
    const totalResolvidosTickets = await prisma.ticket.count({
        where: {
            ...whereClauseObj,
            status: "RESOLVIDO"
        }
    });
    const totalResolvidos = totalResolvidosTickets + completedAppointments.length;

    // Resolvidos por Técnico no Período
    const resolvidosTickets = await prisma.ticket.groupBy({
        by: ['responsavelId'],
        where: {
            ...whereClauseObj,
            status: "RESOLVIDO",
            responsavelId: { not: null }
        },
        _count: {
            id: true
        }
    });

    const techResolvidosMap: Record<string, number> = {};
    resolvidosTickets.forEach(r => {
        if (r.responsavelId) {
            techResolvidosMap[r.responsavelId] = r._count.id;
        }
    });

    completedAppointments.forEach(app => {
        app.technicians.forEach(t => {
            techResolvidosMap[t.id] = (techResolvidosMap[t.id] || 0) + 1;
        });
    });

    const resolvidosRaw = Object.keys(techResolvidosMap).map(id => ({
        responsavelId: id,
        _count: { id: techResolvidosMap[id] }
    }));

    // Em Aberto por Técnico no Período
    const emAbertoRaw = await prisma.ticket.groupBy({
        by: ['responsavelId'],
        where: {
            ...whereClauseObj,
            status: { not: "RESOLVIDO" },
            responsavelId: { not: null }
        },
        _count: {
            id: true
        }
    });

    // User metrics
    const userAbertos = await prisma.ticket.count({
        where: {
            ...whereClauseObj,
            status: { not: "RESOLVIDO" },
            responsavelId: session.user.id
        }
    });

    let userAppointmentsCount = 0;
    completedAppointments.forEach(app => {
        if (app.technicians.some(t => t.id === session.user.id)) {
            userAppointmentsCount++;
        }
    });

    const userResolvidosLocal = (await prisma.ticket.count({
        where: {
            ...whereClauseObj,
            status: "RESOLVIDO",
            responsavelId: session.user.id
        }
    })) + userAppointmentsCount;

    const userAvaliacoesAvg = await prisma.ticket.aggregate({
        _avg: { notaAvaliacao: true },
        where: {
            ...whereClauseObj,
            responsavelId: session.user.id,
            notaAvaliacao: { not: null }
        }
    });
    const userMediaAvaliacao = userAvaliacoesAvg._avg.notaAvaliacao || 0;

    // Media global por tecnico
    const avaliacoesRaw = await prisma.ticket.groupBy({
        by: ['responsavelId'],
        where: {
            ...whereClauseObj,
            responsavelId: { not: null },
            notaAvaliacao: { not: null }
        },
        _avg: { notaAvaliacao: true },
        _count: { notaAvaliacao: true }
    });

    // Coletando Nomes dos Técnicos
    const techIds = Array.from(new Set([
        ...resolvidosRaw.map(r => r.responsavelId as string),
        ...emAbertoRaw.map(r => r.responsavelId as string),
        ...avaliacoesRaw.map(r => r.responsavelId as string)
    ]));

    const users = await prisma.user.findMany({
        where: { id: { in: techIds } },
        select: { id: true, name: true }
    });

    const userMap: Record<string, string> = {};
    users.forEach(u => { userMap[u.id] = u.name || "Desconhecido" });

    const resolvidosPorTecnico = resolvidosRaw.map(r => ({
        name: userMap[r.responsavelId as string] || "Desconhecido",
        quantidade: r._count.id
    }));

    const abertosPorTecnico = emAbertoRaw.map(r => ({
        name: userMap[r.responsavelId as string] || "Desconhecido",
        quantidade: r._count.id
    }));

    // Agrupamento de Chamados por Setor (Departamento)
    const setorRaw = await prisma.ticket.groupBy({
        by: ['departamento'],
        where: whereClauseObj,
        _count: { id: true }
    });

    const chamadosPorSetor = setorRaw.map(r => ({
        name: r.departamento || "Sem Setor",
        quantidade: r._count.id
    })).sort((a, b) => b.quantidade - a.quantidade);

    const avaliacoesPorTecnico = avaliacoesRaw.map(r => ({
        name: userMap[r.responsavelId as string] || "Desconhecido",
        media: Number(r._avg.notaAvaliacao?.toFixed(1)) || 0,
        quantidade: r._count.notaAvaliacao || 0
    })).sort((a, b) => b.media - a.media || b.quantidade - a.quantidade);

    const tecnicoDestaque = avaliacoesPorTecnico.length > 0 ? avaliacoesPorTecnico[0] : null;

    return {
        totalCriados,
        totalAbertos,
        totalFechados: totalResolvidos, // Alias prop just for UI matching
        resolvidosPorTecnico,
        abertosPorTecnico,
        avaliacoesPorTecnico,
        tecnicoDestaque,
        chamadosPorSetor,
        userStats: {
            abertos: userAbertos,
            fechados: userResolvidosLocal,
            mediaAvaliacao: Number(userMediaAvaliacao.toFixed(1))
        }
    };
}
export async function getUserBasicMetrics() {
    const session = await auth();
    if (!session || !session.user) throw new Error("Não autorizado");

    const userId = session.user.id;

    // Total histórico de chamados abertos pelo usuário
    const totalAbrertosHistorico = await prisma.ticket.count({
        where: { solicitanteId: userId }
    });

    // Chamados atualmente em aberto (pendentes)
    const emAbertoAgora = await prisma.ticket.count({
        where: {
            solicitanteId: userId,
            status: { notIn: ["RESOLVIDO", "FECHADO"] }
        }
    });

    return {
        totalAbrertosHistorico,
        emAbertoAgora
    };
}
