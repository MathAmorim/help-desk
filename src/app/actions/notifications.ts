"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getUnreadNotifications() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    const unread = await prisma.notification.findMany({
        where: {
            userId: session.user.id,
            lida: false
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10
    });

    return unread;
}

export async function markAsRead(notificationId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    await prisma.notification.update({
        where: {
            id: notificationId,
            userId: session.user.id
        },
        data: { lida: true }
    });

    // Revalidação manual omitida aqui se client components gerenciarem cache local, 
    // mas pode ser útil para refresh Server Components:
    revalidatePath("/dashboard");
}

export async function markAllAsRead() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    await prisma.notification.updateMany({
        where: {
            userId: session.user.id,
            lida: false
        },
        data: { lida: true }
    });

    revalidatePath("/dashboard");
}
