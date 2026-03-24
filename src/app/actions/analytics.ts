"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getDashboardMetrics(periodo: string) {
    const session = await getServerSession(authOptions);
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

    // Total Resolvidos (Resolvidos no periodo)
    const totalResolvidos = await prisma.ticket.count({
        where: {
            ...whereClauseObj,
            status: "RESOLVIDO"
        }
    });

    // Resolvidos por Técnico no Período
    const resolvidosRaw = await prisma.ticket.groupBy({
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

    const userResolvidosLocal = await prisma.ticket.count({
        where: {
            ...whereClauseObj,
            status: "RESOLVIDO",
            responsavelId: session.user.id
        }
    });

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
        userStats: {
            abertos: userAbertos,
            fechados: userResolvidosLocal,
            mediaAvaliacao: Number(userMediaAvaliacao.toFixed(1))
        }
    };
}
