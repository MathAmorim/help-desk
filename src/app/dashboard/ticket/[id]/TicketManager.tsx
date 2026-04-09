"use client";

import { useState } from "react";
import { 
    updateTicketStatus, 
    updateTicketPriority, 
    updateTicketCategory, 
    vincularTecnicoSecundario, 
    desvincularTecnicoSecundario, 
    getAvailableTechnicians,
    resetTicketToOpen 
} from "@/app/actions/tickets";
import { getCategories } from "@/app/actions/categorias";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
    Loader2, 
    UserCheck, 
    PlayCircle, 
    Clock, 
    RotateCcw,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TicketManagerProps {
    ticketId: string;
    role: string;
    userId: string;
    currentStatus: string;
    currentCategory: string;
    responsavelId: string | null;
    currentPriority: string;
    tecnicosSecundarios?: { id: string; name: string | null; role: string }[];
    userMessageCount: number;
}

export default function TicketManager({ 
    ticketId, 
    role, 
    userId, 
    currentStatus, 
    currentCategory, 
    responsavelId, 
    currentPriority, 
    tecnicosSecundarios,
    userMessageCount 
}: TicketManagerProps) {
    const isSupportOrAdmin = role === "SUPORTE" || role === "ADMIN";
    const isPrimaryTech = userId === responsavelId;
    const isSecondaryTech = tecnicosSecundarios?.some(t => t.id === userId);
    const isAssignedToMe = isPrimaryTech || isSecondaryTech;

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [status, setStatus] = useState(currentStatus);
    const [prioridade, setPrioridade] = useState(currentPriority);
    const [categoria, setCategoria] = useState(currentCategory);
    const [techs, setTechs] = useState(tecnicosSecundarios || []);
    const [availableTechs, setAvailableTechs] = useState<any[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [isLinking, setIsLinking] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);

    // Se não for suporte/admin, sai logo (solicitante comum)
    if (!isSupportOrAdmin) return null;

    // Se o chamado JÁ tem um dono e NÃO sou eu (nem como apoio), não mostro nada.
    // Isso evita que curiosos ou outros técnicos mexam no chamado alheio.
    if (responsavelId && !isAssignedToMe) return null;

    async function loadCategories() {
        if (availableCategories.length === 0) {
            const data = await getCategories();
            setAvailableCategories(data);
        }
    }

    async function loadTechs() {
        if (availableTechs.length === 0) {
            const data = await getAvailableTechnicians();
            setAvailableTechs(data);
        }
    }

    async function handleVincular(tecnicoId: string) {
        if (techs.find(t => t.id === tecnicoId)) return;
        setIsLinking(true);
        try {
            await vincularTecnicoSecundario(ticketId, tecnicoId);
            const user = availableTechs.find(t => t.id === tecnicoId);
            if (user) setTechs([...techs, user]);
        } catch (e) { alert("Erro ao vincular") }
        setIsLinking(false);
    }

    async function handleDesvincular(tecnicoId: string) {
        setIsLinking(true);
        try {
            await desvincularTecnicoSecundario(ticketId, tecnicoId);
            setTechs(techs.filter(t => t.id !== tecnicoId));
        } catch (e) { alert("Erro ao desvincular") }
        setIsLinking(false);
    }

    async function handleUpdateStatus(newStatus: string) {
        if (newStatus === status) return;
        if (newStatus === "RESOLVIDO") return; // Removido fluxo lateral de resolução

        setIsUpdatingStatus(true);
        try {
            await updateTicketStatus(ticketId, newStatus);
            setStatus(newStatus);
        } catch (error: any) {
            alert(error.message || "Erro ao atualizar status.");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    async function handleResetToOpen() {
        setIsUpdatingStatus(true);
        try {
            await resetTicketToOpen(ticketId);
            setIsResetOpen(false);
            // O revalidate do action cuidará do refresh
        } catch (error: any) {
            alert(error.message || "Erro ao resetar chamado.");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    async function handleUpdatePriority(newPriority: string) {
        if (newPriority === prioridade) return;
        setPrioridade(newPriority);
        setIsUpdatingStatus(true);
        try {
            await updateTicketPriority(ticketId, newPriority);
        } catch (error) {
            alert("Erro ao atualizar prioridade.");
            setPrioridade(currentPriority);
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    async function handleUpdateCategory(newCategory: string) {
        if (newCategory === categoria) return;
        setCategoria(newCategory);
        setIsUpdatingStatus(true);
        try {
            await updateTicketCategory(ticketId, newCategory);
        } catch (error) {
            alert("Erro ao atualizar categoria.");
            setCategoria(currentCategory);
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    async function handleAssumirChamado() {
        setIsUpdatingStatus(true);
        try {
            await updateTicketStatus(ticketId, "EM_ANDAMENTO", userId);
            setStatus("EM_ANDAMENTO");
        } catch (error) {
            alert("Erro ao assumir chamado.");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    // Se o chamado já está resolvido, mostramos apenas os metadados fixos
    if (currentStatus === "RESOLVIDO") {
        return (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border shadow-sm mt-6">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold">Chamado Resolvido</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Este chamado foi concluído. Para alterações excepcionais, consulte a administração.
                </p>
            </div>
        );
    }

    const canReset = responsavelId === userId && userMessageCount === 0;

    return (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 pt-5 rounded-lg border space-y-5 shadow-sm mt-6">
            <h3 className="font-semibold text-lg border-b pb-2">Gestão do Chamado</h3>

            <div className="space-y-4">
                {/* Botões de Ação de Status */}
                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Mudar Status</Label>
                    <div className="grid grid-cols-1 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "justify-start h-10 border transition-all",
                                status === "EM_ANDAMENTO" 
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-800 shadow-sm" 
                                    : "bg-white dark:bg-slate-950 hover:bg-slate-50"
                            )}
                            onClick={() => handleUpdateStatus("EM_ANDAMENTO")}
                            disabled={isUpdatingStatus}
                        >
                            <PlayCircle className={cn("mr-2 h-4 w-4", status === "EM_ANDAMENTO" ? "text-indigo-600" : "text-slate-400")} />
                            Em Andamento
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "justify-start h-10 border transition-all",
                                status === "AGUARDANDO_USUARIO" 
                                    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 shadow-sm" 
                                    : "bg-white dark:bg-slate-950 hover:bg-slate-50",
                                !responsavelId && "opacity-60 grayscale-[0.5]"
                            )}
                            onClick={() => handleUpdateStatus("AGUARDANDO_USUARIO")}
                            disabled={isUpdatingStatus || !responsavelId}
                            title={!responsavelId ? "Assuma o chamado para poder pausar" : ""}
                        >
                            <Clock className={cn("mr-2 h-4 w-4", status === "AGUARDANDO_USUARIO" ? "text-amber-600" : "text-slate-400")} />
                            Aguardando Usuário
                        </Button>

                        {canReset && (
                            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                                <DialogTrigger render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-start h-10 border bg-white dark:bg-slate-950 hover:bg-slate-50 text-slate-600 dark:text-slate-400"
                                        disabled={isUpdatingStatus}
                                    />
                                }>
                                    <RotateCcw className="mr-2 h-4 w-4 text-slate-400" />
                                    Reiniciar para Aberto
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                                            <AlertCircle className="h-5 w-5" /> Devolver Chamado
                                        </DialogTitle>
                                        <DialogDescription className="pt-2" render={<div />}>
                                            Você tem certeza que deseja devolver este chamado para a fila de espera?
                                            <br /><br />
                                            Ao confirmar:
                                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                                <li>O status voltará para <strong>ABERTO</strong>.</li>
                                                <li>Você será <strong>removido</strong> como técnico responsável.</li>
                                                <li>Todos os técnicos de apoio serão desvinculados.</li>
                                            </ul>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button variant="ghost" onClick={() => setIsResetOpen(false)} disabled={isUpdatingStatus}>Cancelar</Button>
                                        <Button variant="destructive" onClick={handleResetToOpen} disabled={isUpdatingStatus}>
                                            {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Sim, Devolver Chamado
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="space-y-2 w-full">
                        <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Nível de Prioridade</Label>
                        <Select value={prioridade} onValueChange={(val) => handleUpdatePriority(val as string)} disabled={isUpdatingStatus}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 font-medium h-10">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BAIXA">Baixa</SelectItem>
                                <SelectItem value="MEDIA">Média</SelectItem>
                                <SelectItem value="ALTA">Alta</SelectItem>
                                <SelectItem value="CRITICA">Crítica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 w-full">
                        <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Categoria</Label>
                        <Select onOpenChange={(open) => { if (open) loadCategories() }} value={categoria} onValueChange={(val) => handleUpdateCategory(val as string)} disabled={isUpdatingStatus}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 font-medium h-10">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.length === 0 && <SelectItem value={categoria}>{categoria}</SelectItem>}
                                {availableCategories.map(c => (
                                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {!responsavelId && (
                    <Button onClick={handleAssumirChamado} disabled={isUpdatingStatus} variant="outline" className="h-10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 w-full font-bold transition-all hover:scale-105 active:scale-95 shadow-md">
                        {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                        Assumir Atendimento
                    </Button>
                )}
            </div>

            {responsavelId && (
                <div className="pt-4 border-t mt-4 space-y-3">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Técnicos de Apoio</Label>
                    {techs.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {techs.map(t => (
                                <div key={t.id} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] px-2 py-1 rounded flex items-center gap-1 font-semibold shadow-sm">
                                    {t.name}
                                    <button onClick={() => handleDesvincular(t.id)} className="text-rose-500 hover:text-rose-700 ml-1 rounded-full p-0.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-2">Sem técnicos secundários.</p>
                    )}

                    <Select onOpenChange={(open) => { if (open) loadTechs() }} onValueChange={(val) => val && handleVincular(val as string)} disabled={isLinking}>
                        <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-slate-950 border-dashed">
                            <SelectValue placeholder="Adicionar apoio..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTechs.filter(a => a.id !== responsavelId && !techs.find(t => t.id === a.id)).map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name} ({a.email})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}
