import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: {
                comments: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        autor: {
                            select: { id: true, name: true, role: true }
                        },
                        attachments: true
                    }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
        }

        // Filtra notas internas para usuários comuns
        const filteredComments = ticket.comments.filter(c => {
            if (!c.isInterno) return true;
            return session.user.role === "ADMIN" || session.user.role === "SUPORTE";
        });

        return NextResponse.json(filteredComments);
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
