"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Lock, Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TicketChatBoxProps {
    ticketId: string;
    userId: string;
}

export default function TicketChatBox({ ticketId, userId }: TicketChatBoxProps) {
    const { data: comments, error, isLoading } = useSWR(
        `/api/tickets/${ticketId}/comments`,
        fetcher,
        { refreshInterval: 4000 } // 4 segundos
    );

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll para o final quando novos comentários chegam
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [comments]);

    if (error) return <div className="text-red-500 text-center py-4">Erro ao carregar mensagens.</div>;
    if (isLoading && !comments) {
        return (
            <div className="space-y-4 py-4">
                <Skeleton className="h-20 w-[60%] rounded-lg" />
                <Skeleton className="h-24 w-[70%] ml-auto rounded-lg" />
                <Skeleton className="h-16 w-[50%] rounded-lg" />
            </div>
        );
    }

    if (!comments || comments.length === 0) {
        return (
            <div className="text-center text-slate-500 dark:text-slate-400 py-10 italic bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed">
                Nenhuma interação até o momento. Inicie a conversa abaixo!
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[600px] overflow-y-auto px-2 py-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {comments.map((comment: any) => {
                const isMe = comment.autor.id === userId;
                
                return (
                    <div key={comment.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`
                            max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm relative
                            ${comment.isInterno 
                                ? "bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50" 
                                : isMe 
                                    ? "bg-indigo-600 text-white rounded-tr-none" 
                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none"}
                        `}>
                            {/* Nome do Autor (apenas se não for eu) */}
                            {!isMe && (
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${comment.isInterno ? "text-amber-800 dark:text-amber-300" : "text-indigo-600 dark:text-indigo-400"}`}>
                                        {comment.autor.name}
                                    </span>
                                    {comment.autor.role !== "USUARIO" && (
                                        <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-slate-300 dark:border-slate-600">
                                            {comment.autor.role}
                                        </Badge>
                                    )}
                                </div>
                            )}

                            {/* Indicador de Nota Interna */}
                            {comment.isInterno && (
                                <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    <Lock className="h-3 w-3" /> NOTA INTERNA
                                </div>
                            )}

                            <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isMe && !comment.isInterno ? "text-indigo-50" : "text-slate-700 dark:text-slate-200"}`}>
                                {comment.texto}
                            </p>

                            {/* Anexos */}
                            {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {comment.attachments.map((att: any) => (
                                        <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                                            className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-lg border transition-all hover:scale-105 active:scale-95 shadow-sm
                                            ${isMe && !comment.isInterno 
                                                ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
                                                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"}`}>
                                            <Paperclip className="h-3 w-3 opacity-70" />
                                            <span className="truncate max-w-[150px] font-medium">{att.fileName}</span>
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Data/Hora */}
                            <div className={`text-[9px] mt-2 flex justify-end font-medium ${isMe && !comment.isInterno ? "text-indigo-200" : "text-slate-400"}`}>
                                {new Date(comment.createdAt).toLocaleString("pt-BR", {
                                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
            {/* Elemento de âncora para scroll */}
            <div ref={scrollRef} className="h-1" />
        </div>
    );
}
