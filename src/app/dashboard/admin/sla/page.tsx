import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSLASettings } from "@/app/actions/tickets";
import SLASettingsForm from "./SLASettingsForm";
import { redirect } from "next/navigation";

export default async function SLASettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const settings = await getSLASettings();

    return (
        <div className="p-4 sm:p-8">
            <SLASettingsForm initialData={settings} />
        </div>
    );
}
