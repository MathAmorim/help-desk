import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ConfiguracoesForm from "./ConfiguracoesForm";

export default async function ConfiguracoesPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, role: true }
    });

    if (!user) return null;

    return (
        <div className="space-y-6 max-w-2xl mx-auto mt-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Meu Perfil</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Gerencie suas informações pessoais e credenciais de acesso.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6">
                    <ConfiguracoesForm initialNome={user.name || ""} email={user.email || ""} />
                </div>
            </div>
        </div>
    );
}
