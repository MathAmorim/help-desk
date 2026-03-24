"use client";

import { useState } from "react";
import { updateTicketStatus, updateTicketPriority, updateTicketCategory, vincularTecnicoSecundario, desvincularTecnicoSecundario, getAvailableTechnicians } from "@/app/actions/tickets";
import { getCategories } from "@/app/actions/categorias";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, UserCheck } from "lucide-react";

interface TicketManagerProps {
    ticketId: string;
    role: string;
    userId: string;
    currentStatus: string;
    currentCategory: string;
    responsavelId: string | null;
    currentPriority: string;
    tecnicosSecundarios?: { id: string; name: string | null; role: string }[];
}

export default function TicketManager({ ticketId, role, userId, currentStatus, currentCategory, responsavelId, currentPriority, tecnicosSecundarios }: TicketManagerProps) {
    const isSupportOrAdmin = role === "SUPORTE" || role === "ADMIN";

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [status, setStatus] = useState(currentStatus);
    const [prioridade, setPrioridade] = useState(currentPriority);
    const [categoria, setCategoria] = useState(currentCategory);
    const [techs, setTechs] = useState(tecnicosSecundarios || []);
    const [availableTechs, setAvailableTechs] = useState<any[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [isLinking, setIsLinking] = useState(false);

    if (!isSupportOrAdmin) return null;

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
        if (newStatus === currentStatus) return;

        if (newStatus === "RESOLVIDO" && !responsavelId) {
            alert("⚠️ Um chamado não pode ser marcado como resolvido sem ter um responsável atribuído.");
            setStatus(currentStatus);
            return;
        }

        setStatus(newStatus);
        setIsUpdatingStatus(true);
        try {
            await updateTicketStatus(ticketId, newStatus);
        } catch (error: any) {
            alert(error.message || "Erro ao atualizar status.");
            setStatus(currentStatus);
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
        } catch (error) {
            alert("Erro ao assumir chamado.");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    if (currentStatus === "RESOLVIDO") {
        return (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border shadow-sm mt-6">
                <Label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide font-semibold">Alteração Extraordinária</Label>
                <Select value={status} onValueChange={(val) => handleUpdateStatus(val as string)} disabled={isUpdatingStatus}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ABERTO">Aberto</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                        <SelectItem value="PENDENTE_USUARIO">Pendente (Usuário)</SelectItem>
                        <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 pt-5 rounded-lg border space-y-4 shadow-sm mt-6">
            <h3 className="font-semibold text-lg border-b pb-2">Gestão do Chamado</h3>

            <div className="space-y-4">
                <div className="space-y-2 w-full">
                    <Label>Alterar Status</Label>
                    <Select value={status} onValueChange={(val) => handleUpdateStatus(val as string)} disabled={isUpdatingStatus}>
                        <SelectTrigger className="bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Selecione um status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ABERTO">Aberto</SelectItem>
                            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                            <SelectItem value="PENDENTE_USUARIO">Pendente (Usuário)</SelectItem>
                            <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 w-full">
                    <Label>Nível de Prioridade</Label>
                    <Select value={prioridade} onValueChange={(val) => handleUpdatePriority(val as string)} disabled={isUpdatingStatus}>
                        <SelectTrigger className="bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Selecione uma prioridade..." />
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
                    <Label>Categoria do Chamado</Label>
                    <Select onOpenChange={(open) => { if (open) loadCategories() }} value={categoria} onValueChange={(val) => handleUpdateCategory(val as string)} disabled={isUpdatingStatus}>
                        <SelectTrigger className="bg-white dark:bg-slate-950">
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

                {!responsavelId && (
                    <Button onClick={handleAssumirChamado} disabled={isUpdatingStatus} className="bg-indigo-600 hover:bg-indigo-700 w-full">
                        {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                        Assumir Atendimento
                    </Button>
                )}
            </div>

            {responsavelId && (
                <div className="pt-4 border-t mt-4">
                    <Label className="mb-2 block">Técnicos de Apoio Atribuídos</Label>
                    {techs.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {techs.map(t => (
                                <div key={t.id} className="bg-slate-200 text-slate-800 dark:text-slate-200 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium">
                                    {t.name}
                                    <button onClick={() => handleDesvincular(t.id)} className="text-slate-500 dark:text-slate-400 hover:text-red-500 ml-1 rounded-full p-0.5 hover:bg-slate-300 transition-colors">
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">Nenhum técnico secundário.</p>
                    )}

                    <Select onOpenChange={(open) => { if (open) loadTechs() }} onValueChange={(val) => val && handleVincular(val as string)} disabled={isLinking}>
                        <SelectTrigger className="w-full text-sm bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Adicionar técnico de apoio..." />
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
