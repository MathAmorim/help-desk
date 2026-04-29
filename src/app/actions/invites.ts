"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { checkRateLimitIp } from "@/lib/rate-limit";
import { normalizeSearchText } from "@/lib/utils";

export async function generateInviteLink() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
        throw new Error("Não autorizado");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 horas de validade

    await (prisma.inviteToken as any).create({
        data: {
            token,
            expiresAt,
            createdBy: session.user.id
        }
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return {
        success: true,
        inviteUrl: `${baseUrl}/cadastro/${token}`
    };
}

export async function validateInviteToken(token: string) {
    if (!token) return { valid: false, error: "Token ausente" };

    const invite = await (prisma.inviteToken as any).findUnique({
        where: { token }
    });

    if (!invite) return { valid: false, error: "Link inválido ou não encontrado." };
    if (invite.used) return { valid: false, error: "Este link de cadastro já foi utilizado." };
    if (new Date() > invite.expiresAt) return { valid: false, error: "Este link de cadastro expirou." };

    return { valid: true };
}

export async function registerWithInvite(token: string, data: any, clientIp: string = "unknown") {
    // 1. Rate Limit
    const isAllowed = checkRateLimitIp(clientIp, 3, 60 * 1000); // 3 tentativas por minuto
    if (!isAllowed) {
        throw new Error("Muitas tentativas. Por favor, aguarde um momento.");
    }

    // 2. Validar Token novamente no servidor
    const invite = await (prisma.inviteToken as any).findUnique({
        where: { token }
    });

    if (!invite || invite.used || new Date() > invite.expiresAt) {
        throw new Error("O link de cadastro não é mais válido.");
    }

    const { name, email, cpf, password, funcao, setor } = data;

    // 3. Limpar e validar CPF
    const cleanedCpf = (cpf || "").replace(/\D/g, '');
    if (cleanedCpf.length !== 11) {
        throw new Error("O CPF informado deve conter 11 dígitos numéricos.");
    }

    try {
        // 4. Verificar duplicidade de CPF
        const existingCpf = await prisma.user.findUnique({
            where: { cpf: cleanedCpf }
        });

        if (existingCpf) {
            throw new Error("Este CPF já está cadastrado no sistema.");
        }

        // 4.1 Verificar duplicidade de E-mail (se fornecido)
        if (email) {
            const existingEmail = await prisma.user.findUnique({
                where: { email }
            });

            if (existingEmail) {
                throw new Error("Este e-mail já está cadastrado no sistema.");
            }
        }

        // 5. Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // 6. Criar usuário e marcar token como usado em transação
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await (tx.user as any).create({
                data: {
                    name,
                    email: email || null,
                    cpf: cleanedCpf,
                    password: hashedPassword,
                    role: "USUARIO",
                    funcao: funcao || null,
                    setor: setor || null,
                    mustChangePassword: false, // O próprio usuário definiu a senha
                    searchVector: normalizeSearchText(`${name} ${email || ""} ${cleanedCpf} ${setor || ""} ${funcao || ""}`)
                }
            });

            await (tx.inviteToken as any).update({
                where: { id: invite.id },
                data: {
                    used: true,
                    usedAt: new Date(),
                    usedById: newUser.id
                }
            });

            return newUser;
        });

        // 7. Auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "AUTO_CADASTRO_CONVITE",
                detalhes: `Usuário ${name} (${cleanedCpf}) se cadastrou via convite gerado por ${invite.createdBy}.`,
                userId: result.id
            }
        });

        return { success: true };

    } catch (err: any) {
        const errorCode = `ERR_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        
        // Logar o erro real na auditoria
        await (prisma.auditLog as any).create({
            data: {
                acao: "AUTO_CADASTRO_ERROR",
                detalhes: `Erro no cadastro [${errorCode}]: ${err.message}. IP: ${clientIp}`
            }
        });

        // Retornar erro genérico com código para o usuário
        throw new Error(`Não foi possível concluir o cadastro. Por favor, entre em contato com o suporte e informe o código: ${errorCode}`);
    }
}

export async function getExistingSectors() {
    const usersWithSectors = await (prisma.user as any).findMany({
        where: { setor: { not: null } },
        select: { setor: true },
        distinct: ['setor']
    });

    return (usersWithSectors as any[])
        .map((u: any) => u.setor)
        .filter((s: any) => s && s.trim().length > 0)
        .sort() as string[];
}
