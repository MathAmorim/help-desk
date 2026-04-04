"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { updateSLASettings } from "@/app/actions/tickets";

interface SLASettingsFormProps {
    initialData: {
        tempoMaximoAssuncao: number;
        tempoMaximoConclusao: number;
    };
}

export default function SLASettingsForm({ initialData }: SLASettingsFormProps) {
    const [loading, setLoading] = useState(false);
    const [assuncao, setAssuncao] = useState(initialData.tempoMaximoAssuncao);
    const [conclusao, setConclusao] = useState(initialData.tempoMaximoConclusao);

    async function handleSave() {
        setLoading(true);
        try {
            await updateSLASettings({
                tempoMaximoAssuncao: Number(assuncao),
                tempoMaximoConclusao: Number(conclusao)
            });
            toast.success("Configurações de SLA atualizadas com sucesso!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar configurações");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
                <Link href="/dashboard/admin">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Configurações de SLA</h2>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-500" />
                        Acordos de Nível de Serviço
                    </CardTitle>
                    <CardDescription>
                        Defina os tempos máximos para atendimento e resolução dos chamados antes de disparar alertas de atraso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="assuncao">Tempo Máximo para Assunção (Horas)</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="assuncao"
                                type="number"
                                value={assuncao}
                                onChange={(e) => setAssuncao(parseInt(e.target.value))}
                                className="max-w-[120px] font-bold"
                            />
                            <span className="text-sm text-slate-500">
                                Tempo limite para um técnico assumir um chamado "Aberto".
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="conclusao">Tempo Máximo para Conclusão (Horas)</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="conclusao"
                                type="number"
                                value={conclusao}
                                onChange={(e) => setConclusao(parseInt(e.target.value))}
                                className="max-w-[120px] font-bold"
                            />
                            <span className="text-sm text-slate-500">
                                Tempo limite total desde a abertura até a resolução ("Resolvido").
                            </span>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg">
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-2">
                             📌 Importante
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                            O sistema processa estas regras diariamente às 08:30. 
                            Chamados que excederem estes limites gerarão notificações automáticas para todos os administradores.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/30 dark:bg-slate-900/30 border-t p-4 flex justify-end">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold min-w-[140px]"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar SLA
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
