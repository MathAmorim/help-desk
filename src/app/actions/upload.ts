"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

// ========================================
// Whitelist de Segurança — Tipos Permitidos
// ========================================
const ALLOWED_EXTENSIONS = new Set([
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".odt", ".ods", ".zip", ".rar",
]);

const ALLOWED_MIME_PREFIXES = [
    "image/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "text/plain",
    "text/csv",
    "application/vnd.oasis.opendocument",
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.rar",
    "application/x-rar-compressed",
];

export async function uploadFile(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Não autorizado");

    const file = formData.get("file") as File;
    if (!file) throw new Error("Nenhum arquivo enviado");

    // Limite de tamanho: 5MB
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo excede limite de 5MB");
    }

    // Remove caracteres especiais para evitar exploits de Path Traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // Validação de extensão (whitelist)
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`Tipo de arquivo "${ext}" não é permitido. Formatos aceitos: PDF, imagens, documentos Office e texto.`);
    }

    // Validação de MIME type (whitelist por prefixo)
    if (!ALLOWED_MIME_PREFIXES.some(prefix => file.type.startsWith(prefix))) {
        throw new Error("O tipo MIME do arquivo não é aceito pelo sistema.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
