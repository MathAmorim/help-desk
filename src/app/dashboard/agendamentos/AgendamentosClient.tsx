"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAppointment, getAvailableTechnicians, updateAppointmentStatus } from "@/app/actions/appointments";
import { toast } from "sonner";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, Loader2, CheckCircle2, User, Plus } from "lucide-react";

type ViewMode = "month" | "week" | "day";

interface Technician {
    id: string;
    name: string | null;
}

interface Appointment {
    id: string;
    title: string;
    description: string | null;
    status: string;
    startTime: string | Date;
    endTime: string | Date;
    location: string | null;
    user: { id: string; name: string | null };
    technicians: Technician[];
}

export default function AgendamentosClient({ initialAppointments, userId }: { initialAppointments: any[], userId: string }) {
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments.map(a => ({
        ...a,
        startTime: new Date(a.startTime),
        endTime: new Date(a.endTime)
    })));
    
    // Visão de Calendário
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewMode>("month");

    // Modal de Cadastro
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [formStartTime, setFormStartTime] = useState("08:00");
    const [formEndTime, setFormEndTime] = useState("09:00");
    const [availableTechs, setAvailableTechs] = useState<Technician[]>([]);
    const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
    const [isSearchingTechs, setIsSearchingTechs] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal de Detalhes
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // ==========================================
    // NAVEGAÇÃO DO CALENDÁRIO
    // ==========================================
    const next = () => {
        if (view === "month") setCurrentDate(addMonths(currentDate, 1));
        if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
        if (view === "day") setCurrentDate(addDays(currentDate, 1));
    };

    const prev = () => {
        if (view === "month") setCurrentDate(subMonths(currentDate, 1));
        if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
        if (view === "day") setCurrentDate(subDays(currentDate, 1));
    };

    const goToToday = () => setCurrentDate(new Date());

    // ==========================================
    // LÓGICA DE GRADE (MÊS)
    // ==========================================
    const monthDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    // ==========================================
    // LÓGICA DE CADASTRO (FORM)
    // ==========================================
    const applyShortcut = (shortcut: "manha" | "tarde" | "dia_todo") => {
        if (shortcut === "manha") {
            setFormStartTime("08:00");
            setFormEndTime("11:30");
        } else if (shortcut === "tarde") {
            setFormStartTime("13:30");
            setFormEndTime("17:00");
        } else if (shortcut === "dia_todo") {
            setFormStartTime("08:00");
            setFormEndTime("17:00");
        }
    };

    // Efeito para buscar técnicos disponíveis sempre que data/hora mudar
    useEffect(() => {
        if (!isModalOpen) return;
        if (!formDate || !formStartTime || !formEndTime) return;

        const fetchTechs = async () => {
            setIsSearchingTechs(true);
            const startISO = new Date(`${formDate}T${formStartTime}:00`).toISOString();
            const endISO = new Date(`${formDate}T${formEndTime}:00`).toISOString();
            
            const res = await getAvailableTechnicians(startISO, endISO);
            if (res.success) {
                setAvailableTechs(res.technicians);
                // Limpa seleções de técnicos que não estão mais disponíveis
                setSelectedTechs(prev => prev.filter(id => res.technicians.some((t:any) => t.id === id)));
            }
            setIsSearchingTechs(false);
        };

        // Debounce simples
        const timeout = setTimeout(fetchTechs, 500);
        return () => clearTimeout(timeout);
    }, [formDate, formStartTime, formEndTime, isModalOpen]);

    const handleCreateAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (selectedTechs.length === 0) {
            toast.error("Selecione pelo menos um técnico.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const location = formData.get("location") as string;

        const startTime = new Date(`${formDate}T${formStartTime}:00`).toISOString();
        const endTime = new Date(`${formDate}T${formEndTime}:00`).toISOString();

        const result = await createAppointment({
            title, description, location, startTime, endTime, technicianIds: selectedTechs
        });

        if (result.success) {
            toast.success("Agendamento criado com sucesso!");
            setIsModalOpen(false);
            // Inserir localmente para atualizar a tela sem reload e manter ordenado
            setAppointments(prev => {
                if (!result.appointment) return prev;
                
                const newAppointments = [...prev, {
                    ...result.appointment,
                    startTime: new Date(result.appointment.startTime),
                    endTime: new Date(result.appointment.endTime),
                    technicians: availableTechs.filter(t => selectedTechs.includes(t.id)),
                    user: { id: userId, name: "Você" }
                } as any];
                
                return newAppointments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            });
            
            // Reset state
            setSelectedTechs([]);
            setFormDate(format(new Date(), "yyyy-MM-dd"));
            setFormStartTime("08:00");
            setFormEndTime("09:00");
        } else {
            toast.error(result.error);
        }
        setIsSubmitting(false);
    };

    const handleComplete = async (id: string) => {
        const result = await updateAppointmentStatus(id, "COMPLETED");
        if (result.success) {
            toast.success("Serviço marcado como concluído!");
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "COMPLETED" } : a));
            setSelectedAppointment(null);
        } else {
            toast.error(result.error);
        }
    };

    // ==========================================
    // RENDERIZADORES DE EVENTOS
    // ==========================================
    const getEventsForDay = (day: Date) => {
        return appointments.filter(app => isSameDay(new Date(app.startTime), day));
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 sm:border border-y sm:border-x-0 border-slate-200 dark:border-slate-800 sm:rounded-2xl sm:shadow-sm overflow-hidden">
            
            {/* TOOLBAR DO CALENDÁRIO */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 gap-3 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex h-9 border-slate-200 dark:border-slate-700">Hoje</Button>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8 sm:h-9 sm:w-9"><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                        <Button variant="ghost" size="icon" onClick={next} className="h-8 w-8 sm:h-9 sm:w-9"><ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold capitalize ml-1 sm:ml-2 text-slate-800 dark:text-slate-100 min-w-[120px] sm:min-w-[150px]">
                        {view === "month" && format(currentDate, "MMMM yyyy", { locale: ptBR })}
                        {view === "week" && `Semana de ${format(startOfWeek(currentDate), "dd MMM", { locale: ptBR })}`}
                        {view === "day" && format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </h2>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button onClick={() => setView("month")} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${view === "month" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>Mês</button>
                        <button onClick={() => setView("week")} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${view === "week" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>Semana</button>
                        <button onClick={() => setView("day")} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${view === "day" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>Dia</button>
                    </div>
                    
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger className="inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white h-8 sm:h-9 px-2 sm:px-3 shadow-sm shrink-0">
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> Agendar
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <form onSubmit={handleCreateAppointment}>
                                <DialogHeader>
                                    <DialogTitle>Novo Agendamento</DialogTitle>
                                    <DialogDescription>Preencha os dados e aloque os técnicos disponíveis.</DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid gap-5 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Serviço / Título</Label>
                                        <Input id="title" name="title" required placeholder="Ex: Manutenção Preventiva Servidor 01" />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="location">Localização</Label>
                                            <Input id="location" name="location" placeholder="Ex: CPD" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data do Serviço</Label>
                                            <Input 
                                                type="date" 
                                                value={formDate}
                                                onChange={(e) => setFormDate(e.target.value)}
                                                min={format(new Date(), "yyyy-MM-dd")} 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                            <Label className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
                                                <Clock className="h-4 w-4" /> Janela de Tempo
                                            </Label>
                                            <div className="flex flex-wrap gap-1 sm:gap-1">
                                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => applyShortcut("manha")}>Manhã</Button>
                                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => applyShortcut("tarde")}>Tarde</Button>
                                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => applyShortcut("dia_todo")}>Dia Todo</Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Início</Label>
                                                <Input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Término</Label>
                                                <Input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Users className="h-4 w-4" /> Técnicos Disponíveis no Horário
                                            {isSearchingTechs && <Loader2 className="h-3 w-3 animate-spin text-slate-400 ml-2" />}
                                        </Label>
                                        
                                        {!isSearchingTechs && availableTechs.length === 0 ? (
                                            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                                                Nenhum técnico disponível neste horário exato.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                                {availableTechs.map(tech => (
                                                    <label key={tech.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedTechs.includes(tech.id) ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                            checked={selectedTechs.includes(tech.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedTechs([...selectedTechs, tech.id]);
                                                                else setSelectedTechs(selectedTechs.filter(id => id !== tech.id));
                                                            }}
                                                        />
                                                        <span className="text-sm font-medium">{tech.name?.split(' ')[0]}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Detalhes <span className="text-xs font-normal text-slate-500">(Opcional)</span></Label>
                                        <textarea id="description" name="description" rows={2} className="w-full flex rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950" />
                                    </div>
                                </div>
                                
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isSubmitting || selectedTechs.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Confirmar
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ÁREA PRINCIPAL DO CALENDÁRIO */}
            <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950">
                {view === "month" && (
                    <div className="min-w-0 sm:min-w-[700px] h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                            {monthDays.map((day, idx) => {
                                const events = getEventsForDay(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                return (
                                    <div key={day.toISOString()} className={`min-h-[70px] sm:min-h-[100px] border-b border-r border-slate-100 dark:border-slate-800/50 p-0.5 sm:p-1 flex flex-col ${!isCurrentMonth ? "bg-slate-50/80 dark:bg-slate-900/50 text-slate-400" : "bg-white dark:bg-slate-900"}`}>
                                        <div className={`text-[10px] sm:text-xs font-semibold p-0.5 sm:p-1 mb-0.5 sm:mb-1 text-center rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center mx-auto ${isToday(day) ? "bg-indigo-600 text-white" : ""}`}>
                                            {format(day, 'd')}
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-0.5 sm:space-y-1 pr-0.5 sm:pr-1 custom-scrollbar">
                                            {events.map(ev => (
                                                <div 
                                                    key={ev.id} 
                                                    onClick={() => setSelectedAppointment(ev)}
                                                    className={`text-[8px] sm:text-[10px] md:text-xs truncate px-0.5 py-0.5 sm:px-1.5 sm:py-1 rounded cursor-pointer transition-transform hover:scale-[1.02] shadow-sm font-medium ${
                                                        ev.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : 
                                                        "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                                                    }`}
                                                >
                                                    <span className="font-bold">{format(new Date(ev.startTime), 'HH:mm')}</span> <span className="hidden sm:inline">- {ev.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VISÃO SEMANA: COLUNAS HORIONTAIS */}
                {view === "week" && (
                    <div className="min-w-0 sm:min-w-[900px] h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                            {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map(day => (
                                <div key={day.toISOString()} className="py-2 sm:py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-tighter sm:tracking-wider">
                                        <span className="sm:hidden">{format(day, 'EEEEE', { locale: ptBR })}</span>
                                        <span className="hidden sm:inline">{format(day, 'EEE', { locale: ptBR })}</span>
                                    </div>
                                    <div className={`text-sm sm:text-lg font-bold mt-0.5 sm:mt-1 w-6 h-6 sm:w-8 sm:h-8 mx-auto flex items-center justify-center rounded-full ${isToday(day) ? 'bg-indigo-600 text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                            {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map(day => {
                                const events = getEventsForDay(day);
                                return (
                                    <div key={day.toISOString()} className="min-h-[120px] sm:min-h-[200px] border-r border-slate-200 dark:border-slate-800 p-1 sm:p-2 flex flex-col bg-white dark:bg-slate-900 last:border-r-0">
                                        <div className="flex-1 overflow-y-auto space-y-1 sm:space-y-2 pr-1 custom-scrollbar">
                                            {events.length === 0 ? (
                                                <div className="text-[10px] sm:text-xs text-center text-slate-400 italic mt-2 sm:mt-4">Nenhum serviço</div>
                                            ) : (
                                                events.map(ev => (
                                                    <div 
                                                        key={ev.id} 
                                                        onClick={() => setSelectedAppointment(ev)}
                                                        className={`p-1 sm:p-2 rounded-md sm:rounded-lg cursor-pointer transition-transform hover:scale-[1.02] shadow-sm border ${
                                                            ev.status === "COMPLETED" ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900" : "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800"
                                                        }`}
                                                    >
                                                        <div className={`text-[9px] sm:text-xs font-bold mb-0.5 sm:mb-1 ${ev.status === "COMPLETED" ? "text-emerald-700 dark:text-emerald-400" : "text-indigo-700 dark:text-indigo-400"}`}>
                                                            {format(new Date(ev.startTime), 'HH:mm')} <span className="hidden sm:inline">- {format(new Date(ev.endTime), 'HH:mm')}</span>
                                                        </div>
                                                        <div className={`text-[9px] sm:text-xs font-semibold line-clamp-1 sm:line-clamp-2 ${ev.status === "COMPLETED" ? "text-emerald-900 dark:text-emerald-100" : "text-slate-900 dark:text-slate-100"}`}>
                                                            {ev.title}
                                                        </div>
                                                        <div className="mt-0.5 sm:mt-1 hidden sm:flex items-center gap-1 text-[10px] text-slate-500">
                                                            <Users className="h-3 w-3" /> {ev.technicians.length} téc
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VISÃO DIA: LISTA VERTICAL DETALHADA */}
                {view === "day" && (
                    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
                        {(() => {
                            const daysToShow = [currentDate];
                            
                            return daysToShow.map(day => {
                                const events = getEventsForDay(day);

                                return (
                                    <div key={day.toISOString()} className="space-y-3">
                                        <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-2 ${isToday(day) ? "text-indigo-600 dark:text-indigo-400 border-indigo-200" : "text-slate-500 border-slate-200 dark:border-slate-800"}`}>
                                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                            {isToday(day) && <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">Hoje</span>}
                                        </h3>
                                        
                                        {events.length === 0 ? (
                                            <p className="text-slate-400 text-sm italic py-4 text-center bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">Nenhum serviço agendado para este dia.</p>
                                        ) : (
                                            <div className="grid gap-3">
                                                {events.map(ev => (
                                                    <div 
                                                        key={ev.id} 
                                                        onClick={() => setSelectedAppointment(ev)}
                                                        className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 sm:items-center justify-between cursor-pointer hover:shadow-md transition-all ${
                                                            ev.status === "COMPLETED" ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                                                        }`}
                                                    >
                                                        <div className="flex gap-4 items-start">
                                                            <div className={`p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px] text-center ${ev.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40"}`}>
                                                                <span className="text-sm font-black">{format(new Date(ev.startTime), 'HH:mm')}</span>
                                                                <span className="text-[10px] font-semibold opacity-70 uppercase">até {format(new Date(ev.endTime), 'HH:mm')}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className={`font-bold text-base ${ev.status === "COMPLETED" ? "text-emerald-900 dark:text-emerald-100" : "text-slate-900 dark:text-slate-100"}`}>
                                                                    {ev.title}
                                                                </h4>
                                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                                                                    {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span>}
                                                                    <span className="flex items-center gap-1">
                                                                        <Users className="h-3 w-3" /> 
                                                                        {ev.technicians.length} técnico(s): {ev.technicians.map(t => t.name?.split(' ')[0]).join(', ')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 flex items-center justify-end sm:justify-center">
                                                            {ev.status === "COMPLETED" ? (
                                                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400 px-3 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Concluído</span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 px-3 py-1 rounded-full">Agendado</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>

            {/* MODAL DE DETALHES E CONCLUSÃO */}
            {selectedAppointment && (
                <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                <CalendarIcon className="h-5 w-5" />
                                <span className="font-semibold text-sm">{format(new Date(selectedAppointment.startTime), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                            </div>
                            <DialogTitle className="text-xl">{selectedAppointment.title}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase">Horário</span>
                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                        {format(new Date(selectedAppointment.startTime), 'HH:mm')} às {format(new Date(selectedAppointment.endTime), 'HH:mm')}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase">Local</span>
                                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{selectedAppointment.location || "Não especificado"}</div>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">Técnicos Alocados</span>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAppointment.technicians.map(t => (
                                        <div key={t.id} className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-sm text-sm font-medium">
                                            <div className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center"><User className="h-3 w-3" /></div>
                                            {t.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedAppointment.description && (
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase mb-1 block">Detalhes</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                                        {selectedAppointment.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
                            <Button variant="ghost" onClick={() => setSelectedAppointment(null)}>Fechar</Button>
                            {selectedAppointment.status !== "COMPLETED" && (
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                                    onClick={() => handleComplete(selectedAppointment.id)}
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Marcar Serviço como Concluído
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
