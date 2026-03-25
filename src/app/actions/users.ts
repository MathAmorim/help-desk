"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper para gerar string aleatória de 8 caracteres alfanuméricos complexos
function generateRandomPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";

    // Força regras básicas na geração para bater com o Regex de validação depois
    password += "A"; // 1 Maiúscula
    password += "a"; // 1 Minúscula
    password += "1"; // 1 Número
    password += "@"; // 1 Especial

    // Preenche os outros 4 pra formar 8
    for (let i = 0; i < 4; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Mistura os caracteres pra não ficar sempre Aa1@...
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export async function createUser(data: { name: string; email?: string; role: string; cpf: string; funcao?: string; setor?: string }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const { name, email, role, cpf, funcao, setor } = data;

    // Limpa o CPF
    const cleanedCpf = cpf.replace(/\D/g, '');

    if (cleanedCpf.length !== 11) {
        throw new Error("CPF deve conter 11 dígitos.");
    }

    const whereConditions: any[] = [{ cpf: cleanedCpf }];
    if (email) {
        whereConditions.push({ email });
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: whereConditions
        },
    });

    if (existingUser) {
        if (existingUser.email && existingUser.email === email) {
            throw new Error("E-mail já está em uso por outro usuário.");
        }
        if (existingUser.cpf === cleanedCpf) {
            throw new Error("CPF já está em uso por outro usuário.");
        }
    }

    const tempPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email: email || null,
            role,
            cpf: cleanedCpf,
            funcao: funcao || null,
            setor: setor || null,
            password: hashedPassword,
            mustChangePassword: true,
        },
    });

    revalidatePath("/dashboard/admin");

    return {
        success: true,
        user,
        tempPassword // Devolve só pro Admin ver na tela e copiar
    };
}

export async function resetUserPassword(userId: string) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const tempPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            password: hashedPassword,
            mustChangePassword: true,
        },
    });

    revalidatePath("/dashboard/admin");

    return {
        success: true,
        tempPassword
    };
}

export async function updateUser(data: { id: string; name: string; email?: string; role: string; cpf: string; funcao?: string; setor?: string }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const { id, name, email, role, cpf, funcao, setor } = data;

    // Limpa o CPF
    const cleanedCpf = cpf.replace(/\D/g, '');

    if (cleanedCpf.length !== 11) {
        throw new Error("CPF deve conter 11 dígitos.");
    }

    const whereConditions: any[] = [{ cpf: cleanedCpf }];
    if (email) {
        whereConditions.push({ email });
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            id: { not: id },
            OR: whereConditions
        },
    });

    if (existingUser) {
        if (existingUser.email && existingUser.email === email) {
            throw new Error("E-mail já está em uso por outro usuário.");
        }
        if (existingUser.cpf === cleanedCpf) {
            throw new Error("CPF já está em uso por outro usuário.");
        }
    }

    const user = await prisma.user.update({
        where: { id },
        data: {
            name,
            email: email || null,
            role,
            cpf: cleanedCpf,
            funcao: funcao || null,
            setor: setor || null,
        },
    });

    revalidatePath("/dashboard/admin");

    return {
        success: true,
        user,
    };
}
