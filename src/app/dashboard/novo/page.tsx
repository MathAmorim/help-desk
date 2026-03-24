import NewTicketForm from "./NewTicketForm";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NovoChamadoPage() {
    const categorias = await prisma.category.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' }
    });

    return <NewTicketForm categorias={categorias} />;
}
