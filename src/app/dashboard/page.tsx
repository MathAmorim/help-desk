import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTickets, getMyTickets } from "@/app/actions/tickets";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Star } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Filters } from "./Filters";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return null;
    }

    const sp = await searchParams;

    const filters = {
        q: typeof sp.q === 'string' ? sp.q : undefined,
        status: typeof sp.status === 'string' ? sp.status : undefined,
        categoria: typeof sp.categoria === 'string' ? sp.categoria : undefined,
        atrasado: sp.atrasado === 'true',
    };

    const isAdminOrSupport = session.user.role === "SUPORTE" || session.user.role === "ADMIN";
    const tickets = isAdminOrSupport ? await getAllTickets(filters) : await getMyTickets(filters);

    const categoriasDb = await prisma.category.findMany({ select: { nome: true }, orderBy: { nome: "asc" } });
    const categoriasList = categoriasDb.map((c: any) => c.nome);

    // @ts-ignore - Prisma client maybe out of sync in this environment
    const settings = await prisma.setting.findUnique({ where: { id: "global" } });
    const delayAssuncaoLimit = (settings?.tempoMaximoAssuncao || 24) * 60 * 60 * 1000;
    const delayConclusaoLimit = (settings?.tempoMaximoConclusao || 72) * 60 * 60 * 1000;

    function renderStatusBadge(status: string) {
        switch (status) {
            case "ABERTO": return <Badge className="bg-blue-500 hover:bg-blue-600">Aberto</Badge>;
            case "EM_ANDAMENTO": return <Badge className="bg-amber-500 hover:bg-amber-600">Em Andamento</Badge>;
            case "PENDENTE_USUARIO":
            case "AGUARDANDO_USUARIO": return <Badge className="bg-purple-500 hover:bg-purple-600">Aguardando Usuário</Badge>;
            case "RESOLVIDO": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Resolvido</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    }

    function renderPriorityBadge(prioridade: string) {
        switch (prioridade) {
            case "BAIXA": return <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">Baixa</Badge>;
            case "MEDIA": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:text-blue-400">Média</Badge>;
            case "ALTA": return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Alta</Badge>;
            case "CRITICA": return <Badge variant="destructive" className="bg-red-600 text-white">Crítica</Badge>;
            default: return <Badge variant="outline">{prioridade}</Badge>;
        }
    }

    const unratedTickets = await prisma.ticket.findMany({
        where: {
            solicitanteId: session.user.id,
            status: "RESOLVIDO",
            notaAvaliacao: null
        },
        select: { id: true, titulo: true }
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <AutoRefresh interval={15000} />
            <AnnouncementBanner />
            {unratedTickets.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between text-white gap-4 relative overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
                    <div className="absolute -right-10 -top-10 opacity-10">
                        <Star className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm shrink-0">
                            <Star className="h-6 w-6 fill-amber-300 text-amber-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg sm:text-xl">Você possui atendimentos aguardando nota!</h3>
                            <p className="text-indigo-100 text-sm mt-1">
                                {unratedTickets.length === 1
                                    ? `O chamado "${unratedTickets[0].titulo}" já foi resolvido. Nos conte como foi!`
                                    : `Existem ${unratedTickets.length} chamados concluídos aguardando o seu feedback.`}
                            </p>
                        </div>
                    </div>
                    <Link href={`/dashboard/ticket/${unratedTickets[0].id}#avaliacao`} className="w-full sm:w-auto relative z-10">
                        <Button variant="outline" className="h-11 text-indigo-700 dark:text-indigo-300 border-white bg-white hover:bg-slate-100 font-extrabold transition-all hover:scale-105 active:scale-95 shadow-sm w-full sm:w-auto px-6">
                            Avaliar Agora
                        </Button>
                    </Link>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Painel de Chamados</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isAdminOrSupport
                            ? "Gerencie e atenda os chamados de TI da organização."
                            : "Acompanhe seus chamados de suporte técnico."}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/novo">
                        <Button variant="outline" className="h-11 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-800 font-extrabold transition-all hover:scale-105 active:scale-95 shadow-sm">
                            <PlusCircle className="mr-2 h-5 w-5" /> Novo Chamado
                        </Button>
                    </Link>
                </div>
            </div>

            <Filters categoriasDisponiveis={categoriasList} />

            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">
                                {isAdminOrSupport ? "Todos os Chamados" : "Meus Chamados"}
                            </CardTitle>
                            <CardTitle className="text-xs mt-1 text-slate-500 font-normal">
                                Exibindo {tickets.length} chamados no total.
                            </CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow>
                                    <TableHead className="hidden md:table-cell w-[100px]">ID</TableHead>
                                    <TableHead>Título</TableHead>
                                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Prioridade</TableHead>
                                    {isAdminOrSupport && <TableHead className="hidden md:table-cell">Solicitante</TableHead>}
                                    <TableHead className="hidden md:table-cell">Responsável</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isAdminOrSupport ? 8 : 7} className="h-24 justify-center text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                                <p>Nenhum chamado encontrado.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((ticket: any) => (
                                        <TableRow key={ticket.id} className="hover:bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                                            <TableCell className="hidden md:table-cell font-mono text-xs text-slate-500 dark:text-slate-400">
                                                <div className="font-semibold text-slate-700 dark:text-slate-300">#{ticket.id.substring(ticket.id.length - 6).toUpperCase()}</div>
                                                <div className="text-[10px] whitespace-nowrap opacity-75">{timeAgo(ticket.createdAt)}</div>
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[200px] truncate" title={ticket.titulo}>
                                                {ticket.titulo}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-400 text-sm">
                                                {ticket.categoria}
                                            </TableCell>
                                            <TableCell>
                                                {ticket.encerradoPeloAutor ? (
                                                    <Badge className="bg-emerald-700 hover:bg-emerald-800 text-white">Encerrado pelo Autor</Badge>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {renderStatusBadge(ticket.status)}
                                                        {ticket.status === "ABERTO" && (new Date().getTime() - new Date(ticket.createdAt).getTime() > delayAssuncaoLimit) && (
                                                            <Badge variant="destructive" className="text-[10px] py-0 px-1 h-4 whitespace-nowrap">⏳ SLA ATRASADO</Badge>
                                                        )}
                                                        {(ticket.status === "EM_ANDAMENTO" || ticket.status === "AGUARDANDO_USUARIO" || ticket.status === "PENDENTE_USUARIO") && (new Date().getTime() - new Date(ticket.createdAt).getTime() > delayConclusaoLimit) && (
                                                            <Badge variant="destructive" className="text-[10px] py-0 px-1 h-4 whitespace-nowrap">🚨 SLA ATRASADO</Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {renderPriorityBadge(ticket.prioridade)}
                                            </TableCell>
                                            {isAdminOrSupport && (
                                                <TableCell className="hidden md:table-cell text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium" title={ticket.solicitante?.email}>
                                                            {ticket.solicitante?.name || "Desconhecido"}
                                                        </span>
                                                        {ticket.solicitante?.funcao && (
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[120px]">
                                                                {ticket.solicitante.funcao}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                                                {ticket.encerradoPeloAutor ? (
                                                    <span className="text-emerald-700 dark:text-emerald-500 font-semibold italic">Encerrado pelo Autor</span>
                                                ) : ticket.responsavel ? ticket.responsavel.name : (
                                                    <span className="text-slate-400 italic">Não atribuído</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/dashboard/ticket/${ticket.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm px-3">
                                                        Abrir
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
