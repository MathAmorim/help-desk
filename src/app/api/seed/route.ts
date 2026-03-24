import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const existingUsers = await prisma.user.count();

        if (existingUsers > 0) {
            return NextResponse.json({ message: "Banco já populado com usuários." }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash("123456", 10);

        await prisma.user.createMany({
            data: [
                {
                    name: "Admin do Sistema",
                    email: "admin@acreuna",
                    password: passwordHash,
                    role: "ADMIN",
                },
                {
                    name: "Técnico Suporte",
                    cpf: "11111111111",
                    password: passwordHash,
                    role: "SUPORTE",
                },
                {
                    name: "João Usuário",
                    cpf: "22222222222",
                    password: passwordHash,
                    role: "USUARIO",
                },
            ],
        });

        return NextResponse.json({ message: "Usuários iniciais criados com sucesso!" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao criar usuários" }, { status: 500 });
    }
}
