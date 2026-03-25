"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Não autorizado");
    }

    const name = formData.get("name") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!name) {
        throw new Error("O nome não pode ficar vazio.");
    }

    const updateData: any = { name };

    // Se o usuário preencheu a intenção de trocar de senha
    if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error("Para trocar a senha, preencha a senha atual, a nova e a confirmação.");
        }

        if (newPassword !== confirmPassword) {
            throw new Error("A nova senha e a confirmação não coincidem.");
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) throw new Error("Usuário não encontrado.");

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw new Error("A senha atual está incorreta.");
        }

        // Validação de força de senha
        const hasMinLength = newPassword.length >= 8;
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
            throw new Error("A nova senha deve ter no mínimo 8 caracteres, contendo 1 maiúscula, 1 minúscula e 1 número.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateData.password = hashedPassword;
        updateData.mustChangePassword = false; // Garante que a flag caia caso estivesse bugada
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
    });

    revalidatePath("/dashboard/configuracoes");

    return { success: true };
}

export async function updateTheme(theme: string) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Não autorizado");
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { theme },
        });
    } catch (error) {
        console.error("Erro ao atualizar tema no DB (Usuário pode não existir mais):", error);
        // Não lançamos erro fatal aqui para não quebrar a UI, já que o next-themes já aplicou localmente
    }

    return { success: true };
}
