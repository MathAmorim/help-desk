"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Lock, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-black text-red-500 font-mono">
            <div className="max-w-2xl w-full border-2 border-red-900 bg-red-950/10 p-8 space-y-8 relative overflow-hidden shadow-[0_0_50px_rgba(153,27,27,0.2)]">
                {/* Efeito de Scanline */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]"></div>

                <div className="flex flex-col items-center gap-4 relative z-10">
                    <div className="bg-red-600 p-4 rounded-full animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                        <ShieldAlert className="h-16 w-16 text-black" />
                    </div>
                    <div className="text-center space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">ACESSO RESTRITO</h1>
                        <div className="flex items-center justify-center gap-2 text-sm border-y border-red-900 py-2">
                            <Lock className="h-4 w-4" />
                            <span>PROTOCOLO DE SEGURANÇA 404 ATIVADO</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 text-center relative z-10">
                    <p className="text-red-400 text-lg">
                        Você tentou acessar uma zona de dados classificada. <br />
                        Sua tentativa foi registrada nos logs da central de segurança.
                    </p>
                    <div className="bg-red-900/20 p-4 border border-red-900 text-xs text-left">
                        <p className="opacity-70">DETECÇÃO DE ANOMALIA NO SISTEMA...</p>
                        <p className="opacity-70">IP_ADDR: [REDACTED]</p>
                        <p className="opacity-70">USER_LVL: NAO_AUTORIZADO</p>
                        <p className="font-bold mt-2">AVISO: NÃO PROSSIGA SEM AUTORIZAÇÃO NÍVEL 5.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-4">
                    <Link href="/dashboard" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-black font-bold uppercase tracking-widest transition-all">
                            <Home className="h-4 w-4 mr-2" /> Abortar e Voltar
                        </Button>
                    </Link>

                    {/* O BOTÃO SECRETO CHAMATIVO */}
                    <Button
                        onClick={() => router.push("/secret-game")}
                        className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-amber-500 hover:from-amber-500 hover:to-red-600 text-white font-black uppercase italic tracking-tighter scale-110 hover:scale-125 transition-all shadow-[0_0_30px_rgba(220,38,38,0.8)] border-4 border-white dark:border-red-400"
                    >
                        NÃO CLIQUE NESTE BOTÃO!
                    </Button>
                </div>
            </div>

            <div className="mt-8 text-[10px] opacity-30 tracking-[0.3em] uppercase">
                Departamento de Segurança da Informação • Acesso não autorizado é crime
            </div>
        </div>
    );
}
