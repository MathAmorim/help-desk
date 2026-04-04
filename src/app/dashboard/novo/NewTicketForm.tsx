"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

import { uploadFile } from "@/app/actions/upload";

export default function NewTicketForm({ categorias, userSetor = "", userRole = "USUARIO", existingSetores = [] }: { categorias: any[], userSetor?: string, userRole?: string, existingSetores?: string[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    const podeEditarDepartamento = userRole === "ADMIN" || userRole === "SUPORTE" || !userSetor;

    const categoryObj = categorias.find(c => c.nome === selectedCategory);
    const dynamicPlaceholder = categoryObj?.placeholder || "Descreva o que estava tentando fazer, o que aconteceu e mensagens de erro (se houver).";

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        const titulo = formData.get("titulo") as string;
        const descricao = formData.get("descricao") as string;
        const categoria = formData.get("categoria") as string;
        const departamento = formData.get("departamento") as string;
        const contatoOpcional = formData.get("contatoOpcional") as string;
        const isParaMim = formData.get("paraOutraPessoa") !== "on";

        const filesToUpload = formData.getAll("anexos") as File[];
        const validFiles = filesToUpload.filter(f => f.size > 0 && f.name);

        try {
            if (!categoria) {
                throw new Error("Selecione uma categoria válida.");
            }

            const attachmentIds: string[] = [];

            // Dispara uploads em lote linearmente
            for (const f of validFiles) {
                const fd = new FormData();
                fd.append("file", f);
                const att = await uploadFile(fd);
                attachmentIds.push(att.id);
            }

            await createTicket({
                titulo,
                descricao,
                categoria,
                departamento,
                contatoOpcional,
                paraOutraPessoa: !isParaMim,
                attachmentIds
            });

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao abrir o chamado.");
            setIsLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Novo Chamado</h2>
                    <p className="text-slate-500 dark:text-slate-400">Preencha os dados abaixo para relatar um problema ou solicitação.</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Detalhes da Solicitação</CardTitle>
                        <CardDescription>
                            Tente ser o mais claro possível para que nossa equipe de Suporte possa ajudar rapidamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="departamento">Departamento Solicitante</Label>
                                <Input
                                    id="departamento"
                                    name="departamento"
                                    list="setores-list"
                                    placeholder="Ex: Financeiro, RH, Comercial"
                                    defaultValue={userSetor}
                                    readOnly={!podeEditarDepartamento}
                                    className={!podeEditarDepartamento ? "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700 pointer-events-none" : "bg-white dark:bg-slate-900"}
                                />
                                {podeEditarDepartamento && (
                                    <datalist id="setores-list">
                                        {existingSetores.map(setor => (
                                            <option key={setor} value={setor} />
                                        ))}
                                    </datalist>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contatoOpcional">Telefone ou Ramal (Apenas Números)</Label>
                                <Input
                                    id="contatoOpcional"
                                    name="contatoOpcional"
                                    placeholder="Ex: 11999999999"
                                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 15); }}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-medium border-b pb-2">Sobre o Problema</h3>

                            <div className="space-y-2">
                                <Label htmlFor="categoria">Categoria do Problema <span className="text-red-500">*</span></Label>
                                <Select name="categoria" required onValueChange={(val) => val && setSelectedCategory(val as string)}>
                                    <SelectTrigger id="categoria">
                                        <SelectValue placeholder="Selecione uma categoria..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.map(cat => (
                                            <SelectItem key={cat.id} value={cat.nome}>{cat.nome} ({cat.prioridadePadrao})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[0.8rem] text-slate-500 dark:text-slate-400">
                                    A categoria define a prioridade de atendimento automaticamente.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="titulo">Título Curto <span className="text-red-500">*</span></Label>
                                <Input id="titulo" name="titulo" placeholder="Ex: Computador não liga" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição Detalhada <span className="text-red-500">*</span></Label>
                                <Textarea
                                    id="descricao"
                                    name="descricao"
                                    placeholder={dynamicPlaceholder}
                                    rows={5}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="anexos">Anexos de Arquivos (Capturas de Tela, Logs)</Label>
                                <Input
                                    id="anexos"
                                    name="anexos"
                                    type="file"
                                    multiple
                                    className="cursor-pointer file:cursor-pointer file:bg-slate-100 dark:bg-slate-800 file:text-slate-700 dark:text-slate-300 file:border-0 file:py-1 file:px-2 file:rounded-md file:mr-2 hover:file:bg-slate-200"
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log"
                                />
                                <p className="text-[0.8rem] text-slate-500 dark:text-slate-400 mt-1">
                                    Tamanho máximo 5MB por arquivo.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-md border">
                            <input type="checkbox" id="paraOutraPessoa" name="paraOutraPessoa" className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                            <Label htmlFor="paraOutraPessoa" className="flex-1 cursor-pointer">Este atendimento é para outra pessoa (estou abrindo no lugar de alguém)</Label>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 border-t bg-slate-50/50 dark:bg-slate-900/50 p-6">
                        <Link href="/dashboard">
                            <Button variant="outline" type="button" disabled={isLoading}>Cancelar</Button>
                        </Link>
                        <Button type="submit" className="bg-black text-white hover:bg-black/80" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Abrindo...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" /> Abrir Chamado
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
