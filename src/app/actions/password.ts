"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function changeUserPassword(formData: FormData) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Não autorizado");
    }

    const novaSenha = formData.get("novaSenha") as string;
    const confirmacao = formData.get("confirmacao") as string;

    if (!novaSenha || !confirmacao) {
        throw new Error("Todos os campos são obrigatórios.");
    }

    if (novaSenha !== confirmacao) {
        throw new Error("As senhas não coincidem.");
    }

    // Validação de força de senha
    const hasMinLength = novaSenha.length >= 8;
    const hasUpperCase = /[A-Z]/.test(novaSenha);
    const hasLowerCase = /[a-z]/.test(novaSenha);
    const hasNumber = /[0-9]/.test(novaSenha);

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
        throw new Error("A senha deve ter no mínimo 8 caracteres, contendo 1 maiúscula, 1 minúscula e 1 número.");
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    // Atualiza o banco de dados removendo a flag obrigatória
    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            password: hashedPassword,
            mustChangePassword: false,
        },
    });

    // Limpa os caches pra refletir a ausência da flag
    revalidatePath("/", "layout");

    return { success: true };
}
