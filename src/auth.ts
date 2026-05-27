import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimitIp } from "@/lib/rate-limit"; // Assuming correct path

class CustomAuthError extends CredentialsSignin {
    constructor(message: string) {
        super(message);
        this.code = message;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "CPF ou E-mail (Apenas Admin)", type: "text", placeholder: "123.456.789-00 ou admin@email.com" },
                password: { label: "Senha", type: "password" }
            },
            async authorize(credentials, req) {
                // No Auth.js v5, headers podem precisar ser extraídos diferentemente,
                // mas req pode ser apenas RequestInternal. Vamos tentar usar de forma passiva.
                const identifierStr = credentials?.identifier as string;
                const passwordStr = credentials?.password as string;

                if (!identifierStr || !passwordStr) {
                    throw new CustomAuthError("Identificação e senha são obrigatórios.");
                }

                const isEmail = identifierStr.includes('@');
                const cleanedCpf = identifierStr.replace(/\D/g, '');

                let user = null;

                if (isEmail) {
                    user = await prisma.user.findFirst({ where: { email: identifierStr } });
                    if (user && user.role !== "ADMIN") {
                        throw new CustomAuthError("Acesso Negado: O login via E-mail é exclusivo para Administradores. Por favor, utilize seu CPF.");
                    }
                } else if (cleanedCpf.length === 11) {
                    user = await prisma.user.findFirst({ where: { cpf: cleanedCpf } });
                } else {
                    throw new CustomAuthError("Formato inválido. Digite seu CPF (11 dígitos).");
                }

                if (!user) {
                    await (prisma.auditLog as any).create({
                        data: {
                            acao: "LOGIN_FAILED",
                            detalhes: `Tentativa de login falhou: Usuário [${identifierStr}] não encontrado.`
                        }
                    });
                    throw new CustomAuthError("Usuário não encontrado ou credenciais incorretas.");
                }

                if (!(user as any).ativo) {
                    throw new CustomAuthError("Conta desativada. Por favor, procure o administrador.");
                }

                const isValid = await bcrypt.compare(passwordStr, user.password);

                if (!isValid) {
                    await (prisma.auditLog as any).create({
                        data: {
                            acao: "LOGIN_FAILED",
                            userId: user.id,
                            detalhes: `Tentativa de login falhou: Senha incorreta para o usuário ${user.name} (${user.cpf}).`
                        }
                    });
                    throw new CustomAuthError("Senha incorreta.");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    funcao: user.funcao,
                    mustChangePassword: (user as any).mustChangePassword,
                    theme: user.theme
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
                token.mustChangePassword = (user as any).mustChangePassword;
                token.theme = (user as any).theme;
                token.funcao = (user as any).funcao;
            }

            if (token.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true, mustChangePassword: true }
                    });

                    if (!dbUser) {
                        return null; // logout forced if user deleted
                    }

                    token.role = dbUser.role;
                    token.mustChangePassword = dbUser.mustChangePassword;
                } catch (err) {
                    // Ignore DB errors
                }
            }

            if (trigger === "update") {
                if (session?.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
                if (session?.theme !== undefined) token.theme = session.theme;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).role = token.role as string;
                session.user.id = token.id as string;
                (session.user as any).funcao = token.funcao as string;
                (session.user as any).mustChangePassword = token.mustChangePassword;
                (session.user as any).theme = token.theme as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "super_secret_for_development",
});
