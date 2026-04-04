import { getTicketById } from "@/app/actions/tickets";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, MessageSquare, Lock, FileText, Activity, Paperclip, CheckCircle, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import TicketActions from "./TicketActions";
import TicketManager from "./TicketManager";
import { TicketRating } from "./TicketRating";
import { timeAgo } from "@/lib/utils";
import PrintTicketButton from "./PrintTicketButton";
import ShareTicketButton from "./ShareTicketButton";
import { notFound } from "next/navigation";
export default async function TicketDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session) return null;

    const { id } = await params;
    const ticket = await getTicketById(id);

    if (!ticket) {
        notFound();
    }

    const isSupportOrAdmin = session.user.role === "SUPORTE" || session.user.role === "ADMIN";
    const solucaoComment = ticket.comments.find((c: any) => c.isSolucao);

    function renderStatusBadge(status: string) {
        switch (status) {
            case "ABERTO": return <Badge className="bg-blue-500">Aberto</Badge>;
            case "EM_ANDAMENTO": return <Badge className="bg-amber-500">Em Andamento</Badge>;
            case "PENDENTE_USUARIO": return <Badge className="bg-purple-500">Pendente Usuário</Badge>;
            case "RESOLVIDO": return <Badge className="bg-emerald-500">Resolvido</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 print:space-y-4 print:max-h-[1050px] print:overflow-hidden print:flex print:flex-col">

            {/* Cabeçalho exclusivo para impressão */}
            <div className="hidden print:block text-center border-b border-black pb-4 mb-4">
                <h1 className="text-2xl font-bold uppercase mb-1">Ordem de Serviço</h1>
                <h2 className="text-lg font-semibold">Chamado #{ticket.id.substring(ticket.id.length - 6).toUpperCase()}</h2>
                <p className="text-sm text-slate-800 mt-1">
                    Aberto em {new Date(ticket.createdAt).toLocaleString("pt-BR")} por {ticket.solicitante.name}
                </p>
                {ticket.departamento && <p className="text-sm text-slate-800">Departamento: {ticket.departamento}</p>}
                {ticket.responsavel && <p className="text-sm text-slate-800">Técnico Responsável: {ticket.responsavel.name}</p>}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
                            Chamado #{ticket.id.substring(ticket.id.length - 6).toUpperCase()}
                            {renderStatusBadge(ticket.status)}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Aberto {timeAgo(ticket.createdAt)} em {new Date(ticket.createdAt).toLocaleString("pt-BR")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ShareTicketButton
                        ticketIdHex={ticket.id.substring(ticket.id.length - 6).toUpperCase()}
                        ticketTitle={ticket.titulo}
                    />
                    <PrintTicketButton />
                </div>
            </div>

            {ticket.status === "RESOLVIDO" && ticket.solicitanteId === session.user.id && !ticket.notaAvaliacao && (
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border-[1.5px] border-indigo-200 dark:border-indigo-800 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm print:hidden relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 dark:bg-indigo-900/60 p-2.5 rounded-full shrink-0">
                            <Star className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-200 text-base sm:text-lg">Atendimento concluído! Como foi a sua experiência?</h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5 font-medium leading-relaxed">
                                Seu feedback direto ajuda nossa equipe técnica a avaliar o analista <strong>{ticket.responsavel?.name || "atendente"}</strong> e garantir a excelência no serviço prestado.
                            </p>
                        </div>
                    </div>
                    <a href="#avaliacao" className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md h-10 px-5 shrink-0 w-full sm:w-auto">
                        Deixar meu Feedback
                    </a>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
                {/* Coluna da Esquerda (Detalhes Principais + Conversa) */}
                <div className="lg:col-span-2 space-y-6 print:space-y-4 print:w-full">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 print:shadow-none print:border-black print:border-2">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-xl sm:text-2xl mb-1">{ticket.titulo}</CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                        <Badge variant="secondary">{ticket.categoria}</Badge>
                                        <span className="text-slate-400">•</span>
                                        <span>Prioridade: <strong className="text-slate-700 dark:text-slate-300">{ticket.prioridade}</strong></span>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                {ticket.descricao}
                            </div>

                            {ticket.attachments && ticket.attachments.length > 0 && (
                                <div className="mt-4 border-t pt-4 print:border-black">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5 print:text-black">
                                        <Paperclip className="h-4 w-4" /> Anexos do Chamado
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {ticket.attachments.map((att: any) => (
                                            <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border transition-colors shadow-sm print:border-black print:bg-transparent print:text-black">
                                                <FileText className="h-4 w-4 text-slate-400 print:text-black" />
                                                <span className="truncate max-w-[220px] font-medium">{att.fileName}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bloco de Assinatura (Exclusivo Impressão) */}
                            <div className="hidden print:flex flex-col mt-12 pt-8 border-t-2 border-dashed border-black">
                                {solucaoComment && (
                                    <div className="mb-8 p-4 border border-black rounded-lg">
                                        <h3 className="font-bold text-lg text-black mb-2 uppercase flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" />
                                            Tratativa / Solução
                                        </h3>
                                        <p className="text-sm text-black whitespace-pre-wrap font-medium">{solucaoComment.texto}</p>
                                    </div>
                                )}
                                <p className="text-sm font-medium mb-16 text-center text-black">
                                    Declaro que os serviços técnicos descritos nesta ordem de serviço foram realizados e avaliados a contento,
                                    solucionando o problema reportado.
                                </p>
                                <div className="flex flex-row justify-between items-end gap-10 px-8">
                                    <div className="flex-1 text-center border-t border-black pt-2">
                                        <p className="font-bold text-sm text-black">Assinatura do Técnico</p>
                                        <p className="text-xs text-black mt-1">{ticket.responsavel?.name || "Técnico Responsável"}</p>
                                    </div>
                                    <div className="flex-1 text-center border-t border-black pt-2">
                                        <p className="font-bold text-sm text-black">Assinatura do Solicitante</p>
                                        <p className="text-xs text-black mt-1">{ticket.solicitante.name}</p>
                                        <p className="text-xs text-black mt-3 font-semibold">Data: ___ / ___ / _____</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 print:hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <MessageSquare className="h-5 w-5" /> Timeline de Interações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {ticket.comments.length === 0 && (
                                <div className="text-center text-slate-500 dark:text-slate-400 py-6 italic">
                                    Nenhuma interação até o momento.
                                </div>
                            )}

                            <div className="space-y-4">
                                {ticket.comments.map((comment: any) => (
                                    <div key={comment.id} className={`flex flex-col ${comment.isInterno ? "items-start" : ""}`}>
                                        <div className={`
                      max-w-[90%] sm:max-w-[80%] rounded-lg p-4 
                      ${comment.isInterno
                                                ? "bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 ml-4"
                                                : comment.autor.role === "USUARIO"
                                                    ? "bg-slate-100 dark:bg-slate-800 border"
                                                    : "bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800/50 mr-4"}
                    `}>
                                            <div className="flex items-center justify-between mb-2 gap-4">
                                                <span className="font-semibold text-sm flex items-center gap-2">
                                                    {comment.autor.name}
                                                    {comment.autor.role !== "USUARIO" && (
                                                        <Badge variant="outline" className="text-[10px] py-0 h-4">{comment.autor.role}</Badge>
                                                    )}
                                                    {comment.isInterno && (
                                                        <Badge variant="destructive" className="bg-amber-500 text-white text-[10px] py-0 h-4 flex items-center">
                                                            <Lock className="h-2.5 w-2.5 mr-1" /> Interno
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {new Date(comment.createdAt).toLocaleString("pt-BR", {
                                                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{comment.texto}</p>

                                            {comment.attachments && comment.attachments.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {comment.attachments.map((att: any) => (
                                                        <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors shadow-sm
                                                           ${comment.isInterno ? "bg-amber-100/50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400 hover:bg-amber-100"
                                                                    : comment.autor.role === "USUARIO" ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
                                                                        : "bg-blue-100/50 border-blue-200 text-blue-800 dark:text-blue-400 hover:bg-blue-100"}`}>
                                                            <Paperclip className="h-3 w-3 opacity-70" />
                                                            <span className="truncate max-w-[180px] font-medium">{att.fileName}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            <TicketActions
                                ticketId={ticket.id}
                                role={session.user.role}
                                userId={session.user.id}
                                currentStatus={ticket.status}
                                currentCategory={ticket.categoria}
                                responsavelId={ticket.responsavelId}
                                aguardandoReabertura={ticket.aguardandoReabertura}
                                currentPriority={ticket.prioridade}
                                tecnicosSecundarios={ticket.tecnicosSecundarios}
                            />

                            {/* Avaliação do Chamado (Visível apenas para o autor se RESOLVIDO e sem nota prévia) */}
                            {ticket.status === "RESOLVIDO" && ticket.solicitanteId === session.user.id && !ticket.notaAvaliacao && (
                                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                                    <TicketRating ticketId={ticket.id} />
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>

                {/* Coluna da Direita (Metadados e Auditoria) */}
                <div className="space-y-6 print:hidden">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b py-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Dados do Solicitante
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-sm">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Nome / E-mail</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{ticket.solicitante.name}</span>
                                <span className="block text-slate-500 dark:text-slate-400">{ticket.solicitante.email}</span>
                            </div>
                            {ticket.departamento && (
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Departamento</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-medium">{ticket.departamento}</span>
                                </div>
                            )}
                            {ticket.contatoOpcional && (
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Contato Alternativo</span>
                                    <span className="text-slate-800 dark:text-slate-200">{ticket.contatoOpcional}</span>
                                </div>
                            )}
                            {ticket.paraOutraPessoa && (
                                <div className="bg-orange-50 text-orange-800 p-2 rounded border border-orange-200 font-medium text-xs mt-2">
                                    Atenção: Aberto para / em nome de terceiros.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b py-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Atendimento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 text-sm">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Responsável Técnico</span>
                                {ticket.encerradoPeloAutor ? (
                                    <span className="font-bold text-emerald-600 dark:text-emerald-500 italic">Encerrado pelo Solicitante</span>
                                ) : ticket.responsavel ? (
                                    <span className="font-bold flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        {ticket.responsavel.name}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 italic">Disponível na Fila</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <TicketManager
                        ticketId={ticket.id}
                        role={session.user.role}
                        userId={session.user.id}
                        currentStatus={ticket.status}
                        currentCategory={ticket.categoria}
                        responsavelId={ticket.responsavelId}
                        currentPriority={ticket.prioridade}
                        tecnicosSecundarios={ticket.tecnicosSecundarios}
                    />

                    {isSupportOrAdmin && ticket.auditLogs && (
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b py-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="h-4 w-4" /> Trilha de Auditoria
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 text-xs">
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-1.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                                    {ticket.auditLogs.map((log: any) => (
                                        <div key={log.id} className="relative flex items-start gap-3">
                                            <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-2 ring-white dark:ring-slate-950 z-10 shrink-0 mt-1" />
                                            <div>
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{log.acao}</p>
                                                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{log.detalhes}</p>
                                                <p className="text-slate-400 mt-1 italic font-medium">
                                                    {log.user ? log.user.name : "Sistema"} • {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })} ({new Date(log.createdAt).toLocaleDateString("pt-BR")})
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}
