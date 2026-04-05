"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, ShieldAlert, KeyRound, User } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import { useSession } from "next-auth/react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button variant="outline" className="h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 w-full font-bold transition-all hover:scale-105 active:scale-95 shadow-sm" type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Salvar Alterações
        </Button>
    );
}

export default function ConfiguracoesForm({ initialNome, email }: { initialNome: string, email: string }) {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [nameVal, setNameVal] = useState(initialNome || "");
    const { update } = useSession();

    // Verificações em tempo real para o usuário
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    async function handleSubmit(formData: FormData) {
        setError(null);
        setSuccess(false);
        const newPassword = formData.get("newPassword") as string;

        try {
            const res = await updateProfile(formData);
            if (res.success) {
                setSuccess(true);
                // Atualiza a sessão silenciosamente com o novo nome
                const nomeRaw = formData.get("name") as string;
                if (nomeRaw) {
                    await update({ name: nomeRaw });
                }

                // Reseta os campos de senha
                const form = document.getElementById("profile-form") as HTMLFormElement;
                if (form) {
                    (form.elements.namedItem("currentPassword") as HTMLInputElement).value = "";
                    (form.elements.namedItem("newPassword") as HTMLInputElement).value = "";
                    (form.elements.namedItem("confirmPassword") as HTMLInputElement).value = "";
                    setPassword("");
                }
            }
        } catch (err: any) {
            setError(err.message || "Erro inesperado ao salvar perfil.");
        }
    }

    const RequirementCheck = ({ valid, text }: { valid: boolean; text: string }) => (
        <div className="flex items-center gap-2 text-sm mt-1">
            {valid ? (
                <Check className="h-4 w-4 text-green-600" />
            ) : (
                <X className="h-4 w-4 text-slate-300" />
            )}
            <span className={valid ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}>{text}</span>
        </div>
    );

    return (
        <form id="profile-form" action={handleSubmit} className="space-y-6 text-left">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Perfil atualizado com sucesso!</span>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Informações Básicas</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Seu e-mail é utilizado para login e não pode ser alterado por aqui.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" value={email || "Não cadastrado (Login via CPF)"} disabled className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            id="name"
                            name="name"
                            value={nameVal}
                            onChange={(e) => setNameVal(e.target.value)}
                            className="pl-9"
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t space-y-4">
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-amber-600" />
                        Alterar Senha
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Deixe em branco se não quiser alterar a senha.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <PasswordInput id="currentPassword" name="currentPassword" placeholder="Preencha apenas para alterar" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <PasswordInput
                            id="newPassword"
                            name="newPassword"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                        <PasswordInput
                            id="confirmPassword"
                            name="confirmPassword"
                        />
                    </div>
                </div>

                {password.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-md">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Força da Nova Senha:</p>
                        <div className="grid grid-cols-2 gap-x-2">
                            <RequirementCheck valid={hasMinLength} text="Mínimo de 8 caracteres" />
                            <RequirementCheck valid={hasUpperCase} text="Uma letra maiúscula" />
                            <RequirementCheck valid={hasLowerCase} text="Uma letra minúscula" />
                            <RequirementCheck valid={hasNumber} text="Pelo menos um número" />
                        </div>
                    </div>
                )}
            </div>

            <SubmitButton />
        </form>
    );
}
