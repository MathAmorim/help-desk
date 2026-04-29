"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithInvite } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Check, X } from "lucide-react";
import Image from "next/image";
import logoCpd from "@/assets/images/LogoCPD.png";

export default function RegisterForm({ token, sectors }: { token: string; sectors: string[] }) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [customSector, setCustomSector] = useState(false);
    const [password, setPassword] = useState("");

    // Validações em tempo real
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    const RequirementCheck = ({ valid, text }: { valid: boolean; text: string }) => (
        <div className="flex items-center gap-2 text-[11px] mt-1">
            {valid ? (
                <Check className="h-3 w-3 text-emerald-600" />
            ) : (
                <X className="h-3 w-3 text-slate-300" />
            )}
            <span className={valid ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-400"}>{text}</span>
        </div>
    );

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Validação de coincidência
        if (data.password !== data.confirmPassword) {
            setError("As senhas digitadas não coincidem.");
            setIsPending(false);
            return;
        }

        // Validação de complexidade
        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
            setError("A senha não atende aos requisitos mínimos de segurança.");
            setIsPending(false);
            return;
        }

        // Se escolheu 'OUTRO', pegar o valor do campo de texto
        if (data.setor === "OUTRO") {
            data.setor = data.setor_custom as string;
        }

        try {
            const result = await registerWithInvite(token, data);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            }
        } catch (err: any) {
            setError(err.message || "Erro ao realizar cadastro.");
        } finally {
            setIsPending(false);
        }
    }

    if (success) {
        return (
            <Card className="w-full max-w-md mx-auto shadow-lg border-emerald-100 bg-white">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center mb-2">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-in zoom-in duration-300" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-emerald-700">Cadastro Realizado!</CardTitle>
                    <CardDescription className="text-base">
                        Sua conta foi criada com sucesso. Você será redirecionado para a página de login em instantes...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8">
                    <Button onClick={() => router.push("/login")} className="bg-emerald-600 hover:bg-emerald-700">
                        Ir para o Login Agora
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto shadow-2xl border-slate-200 bg-white/95 backdrop-blur-sm border-t-4 border-t-black">
            <CardHeader className="text-center space-y-4 pb-2">
                <div className="flex justify-center -mt-2">
                    <Image
                        src={logoCpd}
                        alt="Logo CPD"
                        width={100}
                        height={100}
                        priority
                        className="w-auto h-16 sm:h-20 object-contain drop-shadow-md"
                    />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Portal de Chamados</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        Crie sua conta para acessar o sistema
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700">Nome Completo</Label>
                            <Input id="name" name="name" placeholder="Digite seu nome completo" required disabled={isPending} className="bg-white border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cpf" className="text-slate-700">CPF (Apenas números)</Label>
                            <Input id="cpf" name="cpf" placeholder="12345678901" required maxLength={14} disabled={isPending} className="bg-white border-slate-200" onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 11) val = val.slice(0, 11);
                                e.target.value = val;
                            }} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700">E-mail (Opcional)</Label>
                            <Input id="email" name="email" type="email" placeholder="seu@email.com" disabled={isPending} className="bg-white border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" title="Mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número" className="text-slate-700">Crie uma Senha Segura</Label>
                            <PasswordInput 
                                id="password" 
                                name="password" 
                                required 
                                disabled={isPending} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8} 
                                placeholder="Sua senha secreta"
                                className="bg-white border-slate-200"
                            />
                            <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg mt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Requisitos:</p>
                                <div className="grid grid-cols-2 gap-x-2">
                                    <RequirementCheck valid={hasMinLength} text="8+ caracteres" />
                                    <RequirementCheck valid={hasUpperCase} text="1 Maiúscula" />
                                    <RequirementCheck valid={hasLowerCase} text="1 Minúscula" />
                                    <RequirementCheck valid={hasNumber} text="1 Número" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-slate-700">Confirme sua Senha</Label>
                            <PasswordInput 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                required 
                                disabled={isPending} 
                                minLength={8} 
                                placeholder="Repita a senha"
                                className="bg-white border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="funcao" className="text-slate-700">Função | Cargo</Label>
                            <Input id="funcao" name="funcao" placeholder="Analista Administrativo" required disabled={isPending} className="bg-white border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="setor" className="text-slate-700">Departamento | Prédio</Label>
                            <p className="text-[10px] text-slate-500 mb-1">
                                Informe o local onde você trabalha (Ex: Secretaria de Saúde, Educação, etc)
                            </p>
                            <Select name="setor" required onValueChange={(val) => setCustomSector(val === "OUTRO")} disabled={isPending}>
                                <SelectTrigger className="w-full bg-white border-slate-200">
                                    <SelectValue placeholder="Selecione seu local de trabalho" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {sectors.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                    <SelectItem value="OUTRO" className="font-bold text-indigo-600">
                                        + Outro (Não listado)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {customSector && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <Label htmlFor="setor_custom" className="text-indigo-600 font-bold">Nome do Novo Departamento</Label>
                                <Input id="setor_custom" name="setor_custom" placeholder="Digite o nome completo do local" required={customSector} disabled={isPending} className="bg-white border-indigo-100" />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2 items-start">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11 font-bold text-base bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md active:scale-[0.98]" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            "Finalizar Cadastro"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
