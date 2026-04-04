import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

type Context = {
    params: Promise<{ filename: string }>;
};

export async function GET(request: NextRequest, { params }: Context) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await params;

    // Buscar o anexo no banco para validar permissões
    const attachmentUrl = `/api/files/${filename}`;
    const attachment = await prisma.attachment.findFirst({
        where: { fileUrl: attachmentUrl },
        include: {
            ticket: true,
            comment: {
                include: { ticket: true }
            }
        }
    });

    if (!attachment) {
        return NextResponse.json({ error: "File not found in database" }, { status: 404 });
    }

    // RBAC: Se for ADMIN ou SUPORTE, passa direto
    if (session.user.role === "USUARIO") {
        let isAuthorized = false;

        if (attachment.ticketId && attachment.ticket) {
            // Anexo ligado a um ticket principal
            if (attachment.ticket.solicitanteId === session.user.id) {
                isAuthorized = true;
            }
        } else if (attachment.commentId && attachment.comment && attachment.comment.ticket) {
            // Anexo ligado a um comentário dentro de um ticket
            if (attachment.comment.ticket.solicitanteId === session.user.id) {
                isAuthorized = true;
            }
        } else {
            // Anexo órfão (acabou de subir mas ainda não salvou o ticket/comentário)
            if ((attachment as any).userId === session.user.id) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: No permission to access this file" }, { status: 403 });
        }
    }

    const filePath = path.join(process.cwd(), "private_uploads", filename);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": attachment.mimeType || "application/octet-stream",
                "Content-Disposition": `inline; filename="${attachment.fileName}"`
            }
        });
    } catch (error) {
        console.error("Error reading file:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
