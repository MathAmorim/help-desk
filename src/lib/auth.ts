import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "CPF ou E-mail (Apenas Admin)", type: "text", placeholder: "123.456.789-00 ou admin@email.com" },
                password: { label: "Senha", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.identifier || !credentials?.password) {
                    throw new Error("Identificação e senha são obrigatórios.");
                }

                const identifier = credentials.identifier;
                const isEmail = identifier.includes('@');
                const cleanedCpf = identifier.replace(/\D/g, '');

                let user = null;

                if (isEmail) {
                    user = await prisma.user.findFirst({ where: { email: identifier } });
                    if (user && user.role !== "ADMIN") {
                        throw new Error("Acesso Negado: O login via E-mail é exclusivo para Administradores. Por favor, utilize seu CPF.");
                    }
                } else if (cleanedCpf.length === 11) {
                    user = await prisma.user.findFirst({ where: { cpf: cleanedCpf } });
                } else {
                    throw new Error("Formato inválido. Digite seu CPF (11 dígitos).");
                }

                if (!user) {
                    throw new Error("Usuário não encontrado ou credenciais incorretas.");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error("Senha incorreta.");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    mustChangePassword: (user as any).mustChangePassword,
                    theme: user.theme
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.mustChangePassword = (user as any).mustChangePassword;
                token.theme = (user as any).theme;
            }

            // Real-Time Validation: Verifica no banco a cada ciclo se a conta foi rebaixada ou excluída.
            if (token.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true, mustChangePassword: true }
                    });

                    if (!dbUser) {
                        // Usuário foi deletado enquanto estava logado. Invalida o token (Logout forçado).
                        return {} as any;
                    }

                    // Sincroniza a Role em tempo real (ex: Se um Admin for rebaixado para USUARIO)
                    token.role = dbUser.role;
                    token.mustChangePassword = dbUser.mustChangePassword;
                } catch (err) {
                    // Ignora em caso de desconexão momentânea do banco para não deslogar a frota inteira atoa.
                }
            }

            // Permite atualizar a flag na sessão após a troca manual (update via useSession)
            if (trigger === "update") {
                if (session?.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
                if (session?.theme !== undefined) token.theme = session.theme;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
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
};
