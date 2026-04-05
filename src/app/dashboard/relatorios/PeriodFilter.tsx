"use client";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";

export default function PeriodFilter({ currentPeriod }: { currentPeriod: string }) {
    const router = useRouter();

    function handleChange(val: string | null) {
        if (!val) return;
        router.push(`/dashboard/relatorios?periodo=${val}`);
    }

    const isCustomMonth = currentPeriod.match(/^\d{4}-\d{2}$/);

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Label className="text-sm text-slate-600 dark:text-slate-400 font-medium">Período:</Label>

            <Select value={isCustomMonth ? "custom" : currentPeriod} onValueChange={handleChange}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Selecione o filtro..." />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mês Atual</SelectItem>
                    <SelectItem value="ano">Últimos 12 Meses</SelectItem>
                    <SelectItem value="tudo">Todo o Histórico</SelectItem>
                    {isCustomMonth && <SelectItem value="custom" className="hidden">Mês Específico</SelectItem>}
                </SelectContent>
            </Select>

            {isCustomMonth ? (
                <div className="relative flex items-center">
                    <input
                        type="month"
                        value={currentPeriod}
                        onChange={(e) => handleChange(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 sm:w-[160px]"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-0 h-9 w-9 text-rose-500 dark:text-rose-400 border-transparent bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        onClick={() => handleChange("mes")}
                        title="Limpar filtro"
                    >
                        <span className="sr-only">Limpar</span>
                        &times;
                    </Button>
                </div>
            ) : (
                <div className="relative inline-flex group">
                    <Button variant="outline" size="icon" className="h-9 w-9 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all hover:scale-105 shadow-sm" title="Escolher mês específico">
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                    <input
                        type="month"
                        value=""
                        onChange={(e) => handleChange(e.target.value)}
                        onClick={(e) => {
                            try {
                                if ('showPicker' in HTMLInputElement.prototype) {
                                    e.currentTarget.showPicker();
                                }
                            } catch (err) { }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                </div>
            )}
        </div>
    );
}
