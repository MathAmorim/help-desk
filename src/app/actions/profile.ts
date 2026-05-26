"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

import { revalidatePath } from "next/cache";
import { normalizeSearchText } from "@/lib/utils";

export async function updateProfile(formData: FormData) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return { success: false, error: "Não autorizado" };
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return { success: false, error: "Usuário não encontrado." };

        const name = formData.get("name") as string;
        const telefone = formData.get("telefone") as string;
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (!name) {
            return { success: false, error: "O nome não pode ficar vazio." };
        }

        const cleanedTelefone = telefone ? telefone.replace(/\D/g, "") : "";
        if (!cleanedTelefone) {
            return { success: false, error: "O telefone é obrigatório." };
        }
        if (cleanedTelefone.length < 10 || cleanedTelefone.length > 11) {
            return { success: false, error: "O número de telefone deve conter o DDD (2 dígitos) seguido de 8 ou 9 dígitos (ex: 11999999999 ou 1133333333)." };
        }

        const updateData: any = { 
            name, 
            telefone: cleanedTelefone,
            searchVector: normalizeSearchText(`${name} ${user.email || ""} ${user.cpf || ""} ${user.setor || ""} ${user.funcao || ""} ${cleanedTelefone}`)
        };

        // Se o usuário preencheu a intenção de trocar de senha
        if (currentPassword || newPassword || confirmPassword) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                return { success: false, error: "Para trocar a senha, preencha a senha atual, a nova e a confirmação." };
            }

            if (newPassword !== confirmPassword) {
                return { success: false, error: "A nova senha e a confirmação não coincidem." };
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return { success: false, error: "A senha atual está incorreta." };
            }

            // Validação de força de senha
            const hasMinLength = newPassword.length >= 8;
            const hasUpperCase = /[A-Z]/.test(newPassword);
            const hasLowerCase = /[a-z]/.test(newPassword);
            const hasNumber = /[0-9]/.test(newPassword);

            if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
                return { success: false, error: "A nova senha deve ter no mínimo 8 caracteres, contendo 1 maiúscula, 1 minúscula e 1 número." };
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
    } catch (error: any) {
        console.error("Erro ao atualizar perfil:", error);
        return { success: false, error: error.message || "Erro técnico ao atualizar perfil." };
    }
}

export async function updateTheme(theme: string) {
    const session = await auth();

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
