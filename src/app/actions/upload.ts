"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export async function uploadFile(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    const file = formData.get("file") as File;
    if (!file) throw new Error("Nenhum arquivo enviado");

    // Limites básicos de segurança (ex: 5MB)
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo excede limite de 5MB");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Remove caracteres especiais para evitar exploits de Path Traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filename = `${uniqueSuffix}-${safeName}`;

    const uploadsDir = path.join(process.cwd(), "private_uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    const fileUrl = `/api/files/${filename}`;

    // Deixa salvo órfão por enquanto; a Action de Criação do Chamado/Comment fará a amarração.
    const attachment = await (prisma as any).attachment.create({
        data: {
            fileName: file.name,
            fileUrl,
            fileSize: file.size,
            mimeType: file.type,
            userId: session.user.id,
        }
    });

    return attachment;
}
