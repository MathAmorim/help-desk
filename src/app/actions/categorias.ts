"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCategory(nome: string, prioridadePadrao: string, placeholder?: string, tempoResolucao?: number) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
        throw new Error("Não autorizado");
    }

    await prisma.category.create({
        data: {
            nome: nome.toUpperCase(),
            prioridadePadrao,
            placeholder,
            tempoResolucao: tempoResolucao ?? 72
        } as any
    });

    revalidatePath("/dashboard/categorias");
    revalidatePath("/dashboard/novo");
    revalidatePath("/dashboard/admin/sla");
}

export async function updateCategory(id: string, nome: string, prioridadePadrao: string, ativo: boolean, placeholder?: string, tempoResolucao?: number) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
        throw new Error("Não autorizado");
    }

    await prisma.category.update({
        where: { id },
        data: {
            nome: nome.toUpperCase(),
            prioridadePadrao,
            ativo,
            placeholder,
            tempoResolucao: tempoResolucao ?? 72
        } as any
    });

    revalidatePath("/dashboard/categorias");
    revalidatePath("/dashboard/novo");
    revalidatePath("/dashboard/admin/sla");
}

export async function getCategories(somenteAtivas = true) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    return prisma.category.findMany({
        where: somenteAtivas ? { ativo: true } : undefined,
        orderBy: { nome: 'asc' }
    });
}
