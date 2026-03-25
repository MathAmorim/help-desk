import NewTicketForm from "./NewTicketForm";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NovoChamadoPage() {
    const session = await getServerSession(authOptions);

    let userSetor = "";
    if (session?.user?.id) {
        const dbUser = await (prisma.user as any).findUnique({
            where: { id: session.user.id }
        });
        userSetor = (dbUser as any)?.setor || "";
    }

    const categorias = await prisma.category.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' }
    });

    return <NewTicketForm categorias={categorias} userSetor={userSetor} />;
}
