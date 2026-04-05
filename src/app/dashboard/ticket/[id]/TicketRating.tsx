"use client";

import { useState } from "react";
import { avaliarChamado } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, CheckCircle2 } from "lucide-react";

export function TicketRating({ ticketId }: { ticketId: string }) {
    const [nota, setNota] = useState(0);
    const [hover, setHover] = useState(0);
    const [comentario, setComentario] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);

    async function handleSubmit() {
        if (nota === 0) return;
        setIsLoading(true);
        try {
            await avaliarChamado(ticketId, nota, comentario);
            setIsDone(true);
        } catch (error) {
            alert("Erro ao enviar avaliação.");
        } finally {
            setIsLoading(false);
        }
    }

    if (isDone) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <h3 className="font-semibold text-emerald-800 text-lg">Obrigado pela sua avaliação!</h3>
                <p className="text-emerald-600 text-sm">Seu feedback nos ajuda a melhorar nosso atendimento.</p>
            </div>
        );
    }

    return (
        <div id="avaliacao" className="bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900 rounded-lg p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200">Como você avalia este atendimento?</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">Sua avaliação é essencial para continuarmos melhorando nosso suporte técnico. Conta pra gente!</p>
            </div>

            <div className="flex justify-center gap-1 my-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setNota(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                        <Star
                            className={`h-8 w-8 ${star <= (hover || nota) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                        />
                    </button>
                ))}
            </div>

            <Textarea
                placeholder="Deixe um comentário e nos conte mais (opcional)..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="resize-none"
            />

            <Button
                onClick={handleSubmit}
                disabled={nota === 0 || isLoading}
                variant="outline"
                className="h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm w-full"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar Avaliação
            </Button>
        </div>
    );
}
