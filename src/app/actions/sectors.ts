"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSectorsWithUsers() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const users = await prisma.user.findMany({
        where: { setor: { not: null } },
        select: { id: true, name: true, email: true, role: true, setor: true },
        orderBy: { name: "asc" }
    });

    const sectorsMap: Record<string, any[]> = {};

    for (const u of users) {
        if (!u.setor) continue;
        if (!sectorsMap[u.setor]) sectorsMap[u.setor] = [];
        sectorsMap[u.setor].push(u);
    }

    const sectorsList = Object.keys(sectorsMap).map(sectorName => ({
        name: sectorName,
        users: sectorsMap[sectorName],
        count: sectorsMap[sectorName].length
    })).sort((a, b) => a.name.localeCompare(b.name));

    return sectorsList;
}

export async function migrateSector(oldSectorName: string, newSectorName: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    if (!oldSectorName || !newSectorName || oldSectorName === newSectorName) {
        throw new Error("Nomes de setor inválidos para migração.");
    }

    await prisma.user.updateMany({
        where: { setor: oldSectorName },
        data: { setor: newSectorName }
    });


    revalidatePath("/dashboard/admin/setores");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/novo");
}

export async function updateUserSector(userId: string, newSectorName: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const targetName = newSectorName.trim() === "" ? null : newSectorName.trim();

    await prisma.user.update({
        where: { id: userId },
        data: { setor: targetName }
    });



    revalidatePath("/dashboard/admin/setores");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/novo");
}
