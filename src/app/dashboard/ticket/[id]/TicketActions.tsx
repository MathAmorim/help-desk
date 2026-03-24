"use client";

import { useState, useRef } from "react";
import { addComment, solicitarReabertura, avaliarReabertura, encerrarChamadoUsuario } from "@/app/actions/tickets";
import { uploadFile } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Lock, UserCheck, CheckCircle } from "lucide-react";

interface TicketActionsProps {
    ticketId: string;
    role: string;
    userId: string;
    currentStatus: string;
    currentCategory: string;
    responsavelId: string | null;
    aguardandoReabertura?: boolean;
    currentPriority: string;
    tecnicosSecundarios?: { id: string; name: string | null; role: string }[];
}

export default function TicketActions({ ticketId, role, userId, currentStatus, currentCategory, responsavelId, aguardandoReabertura, currentPriority, tecnicosSecundarios }: TicketActionsProps) {
    const isSupportOrAdmin = role === "SUPORTE" || role === "ADMIN";

    const [comentario, setComentario] = useState("");
    const [motivoCancelamento, setMotivoCancelamento] = useState("");
    const [isInterno, setIsInterno] = useState(false);
    const [isSolucao, setIsSolucao] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleAddComment() {
        if (!comentario.trim() && files.length === 0) return;
        setIsLoading(true);
        try {
            const attachmentIds: string[] = [];
            for (const f of files) {
                const fd = new FormData();
                fd.append("file", f);
                const att = await uploadFile(fd);
                attachmentIds.push(att.id);
            }

            await addComment(ticketId, comentario, isInterno, attachmentIds, isSolucao);

            setComentario("");
            setIsInterno(false);
            setIsSolucao(false);
            setFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            alert("Erro ao enviar comentário ou arquivos.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSolicitarReabertura() {
        setIsLoading(true);
        try {
            await solicitarReabertura(ticketId);
        } catch (error) {
            alert("Erro ao solicitar reabertura.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAvaliarReabertura(aceitar: boolean) {
        setIsLoading(true);
        try {
            await avaliarReabertura(ticketId, aceitar);
        } catch (error) {
            alert("Erro ao processar a avaliação de reabertura.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleEncerrarChamadoUsuario() {
        setIsLoading(true);
        try {
            await encerrarChamadoUsuario(ticketId, motivoCancelamento);
        } catch (error) {
            alert("Erro ao encerrar chamado antecipadamente.");
        } finally {
            setIsLoading(false);
        }
    }

    if (currentStatus === "RESOLVIDO") {
        return (
            <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border text-center space-y-4 shadow-sm">
                    <Lock className="h-10 w-10 mx-auto text-slate-300" />
                    <div>
                        <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">Chamado Fechado</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">Este chamado foi categorizado como resolvido e não pode receber novas interações de texto.</p>
                    </div>

                    {!isSupportOrAdmin && !aguardandoReabertura && (
                        <div className="pt-2">
                            <Button onClick={handleSolicitarReabertura} disabled={isLoading} variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Preciso de mais ajuda (Solicitar Reabertura)
                            </Button>
                        </div>
                    )}

                    {!isSupportOrAdmin && aguardandoReabertura && (
                        <div className="inline-block bg-amber-50 dark:bg-amber-900/40 text-amber-700 border border-amber-200 dark:border-amber-800/50 px-4 py-2 rounded-md text-sm font-medium mt-2">
                            ⏳ Sua solicitação de reabertura está em análise pela equipe de suporte.
                        </div>
                    )}

                    {isSupportOrAdmin && aguardandoReabertura && (
                        <div className="space-y-3 mt-4 border-t border-amber-200 dark:border-amber-800/50/50 pt-4 max-w-sm mx-auto">
                            <p className="text-sm font-bold text-amber-700">🚨 O usuário solicitou a reabertura do chamado.</p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => handleAvaliarReabertura(true)} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 flex-1">
                                    {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                    Aprovar
                                </Button>
                                <Button onClick={() => handleAvaliarReabertura(false)} disabled={isLoading} variant="destructive" className="flex-1">
                                    {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                    Recusar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Ações de Autoatendimento (Apenas Usuário) */}
            {!isSupportOrAdmin && currentStatus !== "RESOLVIDO" && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        Autoatendimento
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        O problema foi resolvido antes do suporte atuar ou você criou o chamado por engano? Você pode encerrá-lo antecipadamente.
                    </p>
                    <div className="pt-2">
                        <Dialog>
                            <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-emerald-600 text-emerald-700 hover:bg-emerald-50 w-full sm:w-auto font-medium shadow-sm transition-colors h-9 px-4 py-2 text-sm disabled:opacity-50 disabled:pointer-events-none" disabled={isLoading}>
                                Concluir / Cancelar Solicitação
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Encerrar Chamado</DialogTitle>
                                    <DialogDescription>
                                        Tem certeza que deseja encerrar este chamado por conta própria?
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 my-2">
                                    <div className="text-sm text-slate-500 leading-relaxed">
                                        Ao confirmar, o chamado será marcado definitivamente como <strong className="text-emerald-600">RESOLVIDO</strong> e não poderá mais receber interações ou atualizações da equipe técnica de suporte.
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="motivoCancelamento" className="text-slate-700 dark:text-slate-300 font-medium">Como você resolveu? (Opcional)</Label>
                                        <Textarea
                                            id="motivoCancelamento"
                                            placeholder="Descreva brevemente a solução adotada..."
                                            value={motivoCancelamento}
                                            onChange={(e) => setMotivoCancelamento(e.target.value)}
                                            className="resize-none h-24 bg-white dark:bg-slate-950"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
                                    <DialogClose className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium h-10 px-4 py-2 transition-colors disabled:opacity-50" disabled={isLoading}>
                                        Voltar
                                    </DialogClose>
                                    <Button onClick={handleEncerrarChamadoUsuario} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10">
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Sim, encerrar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            )}

            {/* Caixa de Texto para Comentários */}
            <div className="space-y-3">
                <h3 className="font-semibold text-lg">Adicionar Interação</h3>
                <Textarea
                    placeholder="Digite sua mensagem de atualização..."
                    className="min-h-[100px]"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                />

                <div className="flex items-center">
                    <Label htmlFor="action-anexos" className="sr-only">Anexos</Label>
                    <div className="relative flex-1 max-w-sm">
                        <Input
                            id="action-anexos"
                            type="file"
                            multiple
                            ref={fileInputRef}
                            className="cursor-pointer file:cursor-pointer file:bg-slate-100 dark:bg-slate-800 file:text-slate-700 dark:text-slate-300 file:border-0 file:py-1 file:px-2 file:rounded-md file:mr-2 hover:file:bg-slate-200 text-sm h-9"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log"
                            onChange={(e) => {
                                if (e.target.files) {
                                    setFiles(Array.from(e.target.files));
                                }
                            }}
                        />
                    </div>
                    {files.length > 0 && (
                        <span className="ml-3 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {files.length} arquivo(s) selecionado(s)
                        </span>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                    {isSupportOrAdmin ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isInterno"
                                    checked={isInterno}
                                    onChange={(e) => { setIsInterno(e.target.checked); if (e.target.checked) setIsSolucao(false); }}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor="isInterno" className="flex items-center cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                    <Lock className="h-3 w-3 mr-1 text-slate-500 dark:text-slate-400" /> Nota Interna
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isSolucao"
                                    checked={isSolucao}
                                    onChange={(e) => { setIsSolucao(e.target.checked); if (e.target.checked) setIsInterno(false); }}
                                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600"
                                />
                                <Label htmlFor="isSolucao" className="flex items-center cursor-pointer font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/40 dark:border-emerald-800 px-2 py-1 rounded">
                                    <CheckCircle className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Solucionar Chamado
                                </Label>
                            </div>
                        </div>
                    ) : <div />}

                    <Button
                        onClick={handleAddComment}
                        disabled={isLoading || !comentario.trim()}
                        className={isInterno ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isInterno ? "Salvar Nota Interna" : "Enviar Mensagem"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
