"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Busca avisos ativos (não expirados e marcados como ativos)
 */
export async function getActiveAnnouncements() {
    const now = new Date();
    return await prisma.announcement.findMany({
        where: {
            active: true,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } }
            ]
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            creator: {
                select: {
                    name: true
                }
            }
        }
    });
}

/**
 * Busca todos os avisos (para área administrativa)
 */
export async function getAllAnnouncements() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Acesso negado");
    }

    return await prisma.announcement.findMany({
        orderBy: {
            createdAt: "desc"
        },
        include: {
            creator: {
                select: {
                    name: true
                }
            }
        }
    });
}

/**
 * Cria um novo aviso
 */
export async function createAnnouncement(data: {
    title: string;
    content: string;
    severity: string;
    expiresAt?: string | null;
}) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Acesso negado");
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const announcement = await prisma.announcement.create({
        data: {
            title: data.title,
            content: data.content,
            severity: data.severity,
            expiresAt: expiresAt,
            userId: session.user.id
        }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/avisos");
    revalidatePath("/dashboard/admin/avisos");
    return announcement;
}

/**
 * Deleta um aviso
 */
export async function deleteAnnouncement(id: string) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Acesso negado");
    }

    await prisma.announcement.delete({
        where: { id }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/avisos");
}

/**
 * Alterna status de um aviso (Ativo/Inativo)
 */
export async function toggleAnnouncementStatus(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Acesso negado");
    }

    await prisma.announcement.update({
        where: { id },
        data: { active }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/avisos");
    revalidatePath("/dashboard/admin/avisos");
}
