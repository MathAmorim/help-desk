import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TrocarSenhaForm from "./TrocarSenhaForm";
import { Lock } from "lucide-react";

export default async function TrocarSenhaPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // Se ele não precisa trocar a senha, expulsa de volta pro dashboard
    if (!(session.user as any).mustChangePassword) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center mb-6">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-8 w-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ação Necessária</h1>
                <p className="text-sm text-slate-500 mt-2">
                    Por medida de segurança, você precisa criar uma senha pessoal antes de acessar o sistema. Esta ação é obrigatória.
                </p>
            </div>

            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <TrocarSenhaForm />
                </div>
            </div>
        </div>
    );
}
