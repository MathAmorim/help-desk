"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

import { revalidatePath } from "next/cache";
import { normalizeSearchText } from "@/lib/utils";

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
    try {
        const session = await auth();

        if (!session || session.user.role !== "ADMIN") {
            return { success: false, error: "Não autorizado" };
        }

        const { name, email, role, cpf, funcao, setor } = data;

        // Limpa o CPF
        const cleanedCpf = cpf.replace(/\D/g, '');

        if (cleanedCpf.length !== 11) {
            return { success: false, error: "O CPF deve conter exatamente 11 dígitos numéricos." };
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
                return { success: false, error: "Este e-mail já está cadastrado no sistema." };
            }
            if (existingUser.cpf === cleanedCpf) {
                return { success: false, error: "Este CPF já está cadastrado no sistema." };
            }
        }

        const tempPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const user = await (prisma.user as any).create({
            data: {
                name,
                email: (email || null) as any,
                role,
                cpf: cleanedCpf,
                funcao: funcao || null,
                setor: setor || null,
                password: hashedPassword,
                mustChangePassword: true,
                searchVector: normalizeSearchText(`${name} ${email || ""} ${cleanedCpf} ${setor || ""} ${funcao || ""}`)
            },
        });

        // Registrar Log de Auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "USUARIO_CRIADO",
                detalhes: `Usuário ${name} (${cleanedCpf}) criado manualmente pelo administrador ${session.user.name}.`,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard/admin");

        return {
            success: true,
            user,
            tempPassword
        };
    } catch (error: any) {
        console.error("Erro ao criar usuário:", error);
        return { success: false, error: "Ocorreu um erro técnico ao criar o usuário. Tente novamente mais tarde." };
    }
}

export async function resetUserPassword(userId: string) {
    try {
        const session = await auth();

        if (!session || session.user.role !== "ADMIN") {
            return { success: false, error: "Não autorizado" };
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

        // Auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "SENHA_RESETADA",
                detalhes: `Senha do usuário ${user.name} resetada pelo administrador ${session.user.name}.`,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard/admin");

        return {
            success: true,
            tempPassword
        };
    } catch (error: any) {
        console.error("Erro ao resetar senha:", error);
        return { success: false, error: "Erro técnico ao resetar senha." };
    }
}

export async function updateUser(data: { id: string; name: string; email?: string; role: string; cpf: string; funcao?: string; setor?: string }) {
    try {
        const session = await auth();

        if (!session || session.user.role !== "ADMIN") {
            return { success: false, error: "Não autorizado" };
        }

        const { id, name, email, role, cpf, funcao, setor } = data;

        // Limpa o CPF
        const cleanedCpf = cpf.replace(/\D/g, '');

        if (cleanedCpf.length !== 11) {
            return { success: false, error: "O CPF deve conter exatamente 11 dígitos numéricos." };
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
                return { success: false, error: "Este e-mail já está cadastrado para outro usuário." };
            }
            if (existingUser.cpf === cleanedCpf) {
                return { success: false, error: "Este CPF já está cadastrado para outro usuário." };
            }
        }

        const user = await (prisma.user as any).update({
            where: { id },
            data: {
                name,
                email: (email || null) as any,
                role,
                cpf: cleanedCpf,
                funcao: funcao || null,
                setor: setor || null,
                searchVector: normalizeSearchText(`${name} ${email || ""} ${cleanedCpf} ${setor || ""} ${funcao || ""}`)
            },
        });

        // Auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "USUARIO_EDITADO",
                detalhes: `Dados do usuário ${name} (${cleanedCpf}) atualizados pelo administrador ${session.user.name}.`,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard/admin");

        return {
            success: true,
            user,
        };
    } catch (error: any) {
        console.error("Erro ao atualizar usuário:", error);
        return { success: false, error: "Erro técnico ao atualizar o usuário." };
    }
}

export async function deactivateUser(userId: string) {
    try {
        const session = await auth();

        if (!session || session.user.role !== "ADMIN") {
            return { success: false, error: "Não autorizado" };
        }

        if (session.user.id === userId) {
            return { success: false, error: "Você não pode desativar sua própria conta." };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                ativo: false,
                deletedAt: new Date()
            } as any
        });

        // Registrar no Log de Auditoria
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        await (prisma.auditLog as any).create({
            data: {
                acao: "USUARIO_DESATIVADO",
                detalhes: `Usuário [${targetUser?.name || userId}] foi desativado pelo administrador.`,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard/admin");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao desativar usuário:", error);
        return { success: false, error: "Erro técnico ao desativar usuário." };
    }
}

export async function reactivateUser(userId: string) {
    try {
        const session = await auth();

        if (!session || session.user.role !== "ADMIN") {
            return { success: false, error: "Não autorizado" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                ativo: true,
                deletedAt: null
            } as any
        });

        // Registrar no Log de Auditoria
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        await (prisma.auditLog as any).create({
            data: {
                acao: "USUARIO_REATIVADO",
                detalhes: `Usuário [${targetUser?.name || userId}] foi reativado pelo administrador.`,
                userId: session.user.id
            }
        });

        revalidatePath("/dashboard/admin");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao reativar usuário:", error);
        return { success: false, error: "Erro técnico ao reativar usuário." };
    }
}

export async function exportUsersAction() {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const users = await prisma.user.findMany({
        select: {
            name: true,
            email: true,
            role: true,
            cpf: true,
            funcao: true,
            setor: true,
            ativo: true,
            createdAt: true
        },
        orderBy: { name: "asc" }
    });

    return { success: true, users };
}

export async function importUsersAction(usersData: any[]) {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Não autorizado");
    }

    const results = {
        successCount: 0,
        skippedCount: 0,
        tempCredentials: [] as { name: string; cpf: string; tempPassword: string }[],
        skippedUsers: [] as { name: string; reason: string }[],
    };

    for (const data of usersData) {
        try {
            const { name, email, role, cpf, funcao, setor } = data;

            // Limpa o CPF
            const cleanedCpf = (cpf || "").toString().replace(/\D/g, '');

            if (cleanedCpf.length !== 11) {
                results.skippedCount++;
                results.skippedUsers.push({ name: name || "Desconhecido", reason: "CPF Inválido" });
                continue;
            }

            // Verifica se existe CPFs ou E-mail (se informado)
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { cpf: cleanedCpf },
                        ...(email ? [{ email }] : [])
                    ]
                },
            });

            if (existingUser) {
                results.skippedCount++;
                results.skippedUsers.push({ 
                    name: name || cleanedCpf, 
                    reason: `Já existe (CPF/Email duplicado)` 
                });
                continue;
            }

            const tempPassword = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            await (prisma.user as any).create({
                data: {
                    name,
                    email: email || null,
                    role: role || "USUARIO",
                    cpf: cleanedCpf,
                    funcao: funcao || null,
                    setor: setor || null,
                    password: hashedPassword,
                    mustChangePassword: true,
                    searchVector: normalizeSearchText(`${name} ${email || ""} ${cleanedCpf} ${setor || ""} ${funcao || ""}`)
                },
            });

            results.successCount++;
            results.tempCredentials.push({ name, cpf: cleanedCpf, tempPassword });

        } catch (error: any) {
            results.skippedCount++;
            results.skippedUsers.push({ name: data.name || "Erro", reason: error.message });
        }
    }

    revalidatePath("/dashboard/admin");

    return {
        success: true,
        summary: results
    };
}
