"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, ShieldAlert, KeyRound } from "lucide-react";
import { changeUserPassword } from "@/app/actions/password";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button className="w-full bg-black text-white hover:bg-black/80" type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Confirmar Nova Senha
        </Button>
    );
}

export default function TrocarSenhaForm() {
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const router = useRouter();
    const { update } = useSession();

    // Verificações em tempo real para o usuário
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    async function handleSubmit(formData: FormData) {
        setError(null);
        if (password !== confirmacao) {
            setError("As senhas não coincidem.");
            return;
        }

        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
            setError("Por favor, preencha todos os requisitos numéricos e de caracteres da senha.");
            return;
        }

        try {
            const res = await changeUserPassword(formData);
            if (res.success) {
                // Atualiza a sessão para o flag sumir da persistência do NextAuth e deixá-lo entrar
                await update({ mustChangePassword: false });
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "Erro inesperado.");
        }
    }

    const RequirementCheck = ({ valid, text }: { valid: boolean; text: string }) => (
        <div className="flex items-center gap-2 text-sm mt-1">
            {valid ? (
                <Check className="h-4 w-4 text-green-600" />
            ) : (
                <X className="h-4 w-4 text-slate-300" />
            )}
            <span className={valid ? "text-slate-700" : "text-slate-500"}>{text}</span>
        </div>
    );

    return (
        <form action={handleSubmit} className="space-y-6 text-left">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <PasswordInput
                    id="novaSenha"
                    name="novaSenha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua nova senha segura"
                />
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-md">
                <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Requisitos da Senha:</p>
                <div className="grid grid-cols-2 gap-x-2">
                    <RequirementCheck valid={hasMinLength} text="Mínimo de 8 caracteres" />
                    <RequirementCheck valid={hasUpperCase} text="Uma letra maiúscula" />
                    <RequirementCheck valid={hasLowerCase} text="Uma letra minúscula" />
                    <RequirementCheck valid={hasNumber} text="Pelo menos um número" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirmar Nova Senha</Label>
                <PasswordInput
                    id="confirmacao"
                    name="confirmacao"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    required
                    placeholder="Repita a nova senha"
                />
            </div>

            <SubmitButton />
        </form>
    );
}
