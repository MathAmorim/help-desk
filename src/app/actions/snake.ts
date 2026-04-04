"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Salva a pontuação do jogo da cobrinha
 */
export async function saveSnakeScore(score: number) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return { error: "Acesso Negado: Apenas usuários logados podem salvar." };
    }

    try {
        // Usamos as any para evitar erro de tipo caso o prisma generate não tenha rodado
        await (prisma as any).snakeScore.create({
            data: {
                score,
                userId: session.user.id
            }
        });

        revalidatePath("/secret-game");
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar score:", error);
        return { error: "Erro ao salvar pontuação" };
    }
}

/**
 * Busca o ranking global
 */
export async function getLeaderboard() {
    try {
        const scores = await (prisma as any).snakeScore.findMany({
            take: 10,
            orderBy: {
                score: 'desc'
            },
            select: {
                id: true,
                score: true,
                guestName: true,
                user: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return scores;
    } catch (error) {
        console.error("Erro ao buscar leaderboard:", error);
        return [];
    }
}
