"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useId } from "react";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899'];

interface AnalyticsProps {
    resolvidosPorTecnico: { name: string, quantidade: number }[];
    abertosPorTecnico: { name: string, quantidade: number }[];
    avaliacoesPorTecnico: { name: string, media: number, quantidade: number }[];
}

export default function AnalyticsCharts({ resolvidosPorTecnico, abertosPorTecnico, avaliacoesPorTecnico }: AnalyticsProps) {
    const idPrefix = useId();

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Barras: Trabalhos em Aberto pendentes */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-700 dark:text-slate-300">Carga Pendente por Técnico</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    {abertosPorTecnico.length > 0 ? (
                        <div className="w-full h-full"> {/* Parent com w-full ajuda o Recharts no ResizeObservation */}
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={abertosPorTecnico} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Chamados Pendentes" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Sem chamados pendentes (Fila limpa!).</div>
                    )}
                </CardContent>
            </Card>

            {/* Gráfico de Pizza: Volume Resolvido */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-700 dark:text-slate-300">Produtividade (Resolvidos por Técnico)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    {resolvidosPorTecnico.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={resolvidosPorTecnico}
                                    dataKey="quantidade"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={95}
                                    label
                                >
                                    {resolvidosPorTecnico.map((entry, index) => (
                                        <Cell key={`${idPrefix}-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Sem chamados resolvidos no período indicado.</div>
                    )}
                </CardContent>
            </Card>

            {/* Gráfico de Barras: Avaliações (CSAT) */}
            <Card className="shadow-sm lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-700 dark:text-slate-300">Satisfação (CSAT por Técnico)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    {avaliacoesPorTecnico.length > 0 ? (
                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={avaliacoesPorTecnico} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
                                    <YAxis domain={[0, 5]} allowDecimals={true} tickCount={6} tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="media" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Nota Média (0 a 5)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Nenhum técnico foi avaliado pelos usuários neste período.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
