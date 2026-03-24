"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCategory(nome: string, prioridadePadrao: string, placeholder?: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
        throw new Error("Não autorizado");
    }

    await prisma.category.create({
        data: {
            nome: nome.toUpperCase(),
            prioridadePadrao,
            placeholder
        }
    });

    revalidatePath("/dashboard/categorias");
    revalidatePath("/dashboard/novo");
}

export async function updateCategory(id: string, nome: string, prioridadePadrao: string, ativo: boolean, placeholder?: string) {
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
            placeholder
        }
    });

    revalidatePath("/dashboard/categorias");
    revalidatePath("/dashboard/novo");
}

export async function getCategories(somenteAtivas = true) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    return prisma.category.findMany({
        where: somenteAtivas ? { ativo: true } : undefined,
        orderBy: { nome: 'asc' }
    });
}
