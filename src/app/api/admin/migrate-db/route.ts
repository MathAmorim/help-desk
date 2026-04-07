import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeSearchText } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const secretHeader = req.headers.get("x-migration-secret");
        const envSecret = process.env.MIGRATION_SECRET;

        // Se não houver secret configurado no ENV, bloqueia por segurança
        if (!envSecret) {
            return NextResponse.json({ error: "MIGRATION_SECRET non configurado no servidor." }, { status: 500 });
        }

        if (secretHeader !== envSecret) {
            return NextResponse.json({ error: "Acesso negado: Secret inválido." }, { status: 403 });
        }

        const stats = {
            statusUpdated: 0,
            settingsCreated: false,
            usersNormalized: 0,
            ticketsNormalized: 0
        };

        // 1. Tradução de Status: PENDENTE_USUARIO -> AGUARDANDO_USUARIO
        const updateResult = await prisma.ticket.updateMany({
            where: { status: "PENDENTE_USUARIO" },
            data: { status: "AGUARDANDO_USUARIO" },
        });
        stats.statusUpdated = updateResult.count;

        // 2. Inicialização de Settings (SLA)
        const existingSettings = await prisma.setting.findUnique({
            where: { id: "global" }
        });

        if (!existingSettings) {
            await prisma.setting.create({
                data: {
                    id: "global",
                    tempoMaximoAssuncao: 24,
                    tempoMaximoConclusao: 72,
                }
            });
            stats.settingsCreated = true;
        }

        // 3. População de searchVector para Usuários
        const users = await prisma.user.findMany();
        for (const user of users) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    searchVector: normalizeSearchText(`${user.name} ${user.email || ""} ${user.cpf} ${user.setor || ""} ${user.funcao || ""}`)
                }
            });
            stats.usersNormalized++;
        }

        // 4. População de searchVector para Tickets
        const tickets = await prisma.ticket.findMany({
            include: { solicitante: { select: { name: true } } }
        });
        for (const ticket of tickets) {
            await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    searchVector: normalizeSearchText(`${ticket.titulo} ${ticket.descricao} ${ticket.departamento || ""} ${ticket.solicitante?.name || ""}`)
                }
            });
            stats.ticketsNormalized++;
        }

        // 5. Log de Auditoria da Migração
        await prisma.auditLog.create({
            data: {
                acao: "DATABASE_MIGRATION",
                detalhes: `Migração concluída. Status: ${stats.statusUpdated}. Usuários: ${stats.usersNormalized}. Tickets: ${stats.ticketsNormalized}. Settings: ${stats.settingsCreated ? 'criado' : 'existente'}.`
            }
        });

        return NextResponse.json({
            message: "Migração e normalização concluídas com sucesso.",
            stats
        });

    } catch (error: any) {
        console.error("Erro na migração:", error);
        return NextResponse.json({ error: "Erro interno na migração." }, { status: 500 });
    }
}
