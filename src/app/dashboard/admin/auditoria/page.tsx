import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuditoriaClient from "./AuditoriaClient";

export default async function AuditLogPage() {
    const session = await getServerSession(authOptions);

    // Proteção de Rota Crítica (Server Side)
    if (!session || !session.user || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    return (
        <div className="p-4 sm:p-8">
            <AuditoriaClient />
        </div>
    );
}
