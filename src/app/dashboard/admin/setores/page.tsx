import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSectorsWithUsers } from "@/app/actions/sectors";
import SectorClient from "./SectorClient";

export const dynamic = "force-dynamic";

export default async function SectorsAdminPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const sectors = await getSectorsWithUsers();

    return <SectorClient initialSectors={sectors} />;
}
