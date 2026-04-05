"use server"

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function getAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    acao?: string;
    startDate?: string;
    endDate?: string;
}) {
    const session = await getServerSession(authOptions);
    
    // 1. Segurança Rigorosa
    if (!session || !session.user || session.user.role !== "ADMIN") {
        throw new Error("Acesso negado: Apenas administradores podem visualizar os logs.");
    }

    const { 
        page = 1, 
        limit = 50, 
        userId, 
        acao, 
        startDate, 
        endDate 
    } = params;

    const skip = (page - 1) * limit;

    // 2. Construção dinâmica do filtro
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (acao && acao !== "TODOS") where.acao = acao;
    
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00Z`);
        if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59Z`);
    }

    try {
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { name: true, email: true, role: true }
                    },
                    ticket: {
                        select: { titulo: true, id: true }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        // 3. Mascaramento de dados e tratamento seguro
        const sanitizedLogs = logs.map(log => {
            let sanitizedDetails = log.detalhes || "";
            
            // Regex simples para mascarar padrões de segredos que podem vazar em logs de erro
            const sensitivePatterns = [
                /(senha|password|token|secret|key)=[^&\s]*/gi,
                /(["'])(senha|password|token)\1:\s*(["']).*?\3/gi
            ];

            sensitivePatterns.forEach(pattern => {
                sanitizedDetails = sanitizedDetails.replace(pattern, (match, p1, p2) => {
                    if (p2) return `${p1}${p2}${p1}: "********"`; // JSON style
                    return `${p1}=********`; // Key=Value style
                });
            });

            return {
                ...log,
                detalhes: sanitizedDetails
            };
        });

        return {
            logs: sanitizedLogs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    } catch (error) {
        console.error("[AUDIT_LOG_ERROR]", error);
        throw new Error("Falha ao carregar os registros de auditoria.");
    }
}

export async function getAuditUsers() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return [];

    return prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
}
