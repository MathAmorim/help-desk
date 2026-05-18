import { auth } from "@/auth";

import { redirect } from "next/navigation";
import { getAppointments } from "@/app/actions/appointments";
import AgendamentosClient from "./AgendamentosClient";

export const metadata = {
    title: "Agendamentos | Help Desk",
};

export default async function AgendamentosPage() {
    const session = await auth();

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
        redirect("/dashboard");
    }

    // Buscar agendamentos do mês atual para o carregamento inicial do calendário
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const { appointments } = await getAppointments(firstDay, lastDay);

    return (
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Agenda da Equipe</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Gerencie serviços, visitas técnicas e disponibilidade.
                    </p>
                </div>
                
                <AgendamentosClient 
                    initialAppointments={appointments || []} 
                    userId={session.user.id}
                />
            </div>
        </div>
    );
}
