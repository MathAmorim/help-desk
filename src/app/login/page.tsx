"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Headset, Loader2, KeyRound } from "lucide-react";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        }
    }, [status, router]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const result = await signIn("credentials", {
            identifier,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            router.push("/dashboard");
        }
    }

    if (status === "loading" || status === "authenticated") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
            </div>
        );
    }

    return (
        <div
            className="flex min-h-screen w-full flex-col bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/image/acreuna_blueprint.svg')" }}
        >
            <div className="flex flex-1 items-center justify-center p-4 bg-slate-50/70 dark:bg-slate-950/80 ">
                <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-black">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-2">
                            <div className="rounded-full bg-slate-100 p-3">
                                <Headset className="h-8 w-8 text-black" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Portal Help Desk</CardTitle>
                        <CardDescription>
                            Acesse sua conta para abrir chamados ou gerenciar atendimentos.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center font-medium border border-red-200">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="identifier">CPF</Label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="123.456.789-00"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Senha</Label>
                                    <Dialog>
                                        <DialogTrigger className="px-0 h-auto text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" type="button">
                                            Esqueceu a senha?
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Recuperação de Conta</DialogTitle>
                                                <DialogDescription>
                                                    Procedimento para redefinição de senha
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                                                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                                    Para garantir a segurança dos seus dados, a troca de senha deve ser feita pela equipe de TI.
                                                    <br /><br />
                                                    Por favor, entre em contato com o <strong>Suporte Técnico</strong> e informe o seu <strong>CPF</strong> para validar sua identidade e gerar uma nova senha de acesso.
                                                </p>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <PasswordInput
                                    id="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" className="w-full bg-black text-white hover:bg-black/80" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="mr-2 h-4 w-4" /> Entrar
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
