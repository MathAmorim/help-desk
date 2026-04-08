"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, CheckCircle2, AlertTriangle, FileJson, Copy } from "lucide-react";
import { exportUsersAction, importUsersAction } from "@/app/actions/users";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ImportExportButtons() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await exportUsersAction();
            if (res.success && res.users) {
                const blob = new Blob([JSON.stringify(res.users, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `usuarios_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Usuários exportados com sucesso!");
            }
        } catch (error: any) {
            toast.error("Erro ao exportar: " + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!Array.isArray(json)) {
                    throw new Error("O arquivo deve conter uma lista (Array) de usuários.");
                }

                const res = await importUsersAction(json);
                if (res.success) {
                    setResults(res.summary);
                    setShowResults(true);
                    toast.success("Processamento de importação concluído!");
                }
            } catch (error: any) {
                toast.error("Erro na importação: " + error.message);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const downloadCredentials = () => {
        if (!results?.tempCredentials) return;
        const content = results.tempCredentials.map((c: any) => 
            `Nome: ${c.name}\nCPF: ${c.cpf}\nSenha Temporária: ${c.tempPassword}\n-------------------------`
        ).join("\n\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `senhas_importacao_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-10 gap-2 border-dashed border-slate-300 dark:border-slate-700" 
                onClick={handleExport}
                disabled={isExporting}
            >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-emerald-600" />}
                Exportar JSON
            </Button>

            <Button 
                variant="outline" 
                size="sm" 
                className="h-10 gap-2 border-dashed border-slate-300 dark:border-slate-700"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
            >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-blue-600" />}
                Importar JSON
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange} 
            />

            <Dialog open={showResults} onOpenChange={setShowResults}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileJson className="h-5 w-5 text-indigo-500" />
                            Resultado da Importação
                        </DialogTitle>
                        <DialogDescription>
                            Resumo das operações realizadas no banco de dados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 my-2">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900">
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Sucesso</div>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{results?.successCount || 0}</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Pulados</div>
                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{results?.skippedCount || 0}</div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 max-h-[60vh]">
                        <div className="space-y-6">
                            {/* Lista de Duplicatas/Erros */}
                            {results?.skippedUsers?.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Usuários Ignorados (Duplicados ou Inválidos)
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md border text-xs divide-y">
                                        {results.skippedUsers.map((u: any, i: number) => (
                                            <div key={i} className="p-2 flex justify-between items-center whitespace-nowrap overflow-hidden">
                                                <span className="font-semibold truncate mr-2">{u.name}</span>
                                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                                                    {u.reason}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista de Senhas */}
                            {results?.tempCredentials?.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Senhas Geradas (Copie agora)
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md border text-xs divide-y">
                                        {results.tempCredentials.map((c: any, i: number) => (
                                            <div key={i} className="p-2 flex justify-between items-center gap-4">
                                                <div className="flex flex-col truncate">
                                                    <span className="font-bold">{c.name}</span>
                                                    <span className="text-slate-500 font-mono text-[10px]">{c.cpf}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-white dark:bg-slate-950 border px-2 py-1 rounded text-rose-600 font-bold text-sm">
                                                        {c.tempPassword}
                                                    </code>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                        navigator.clipboard.writeText(c.tempPassword);
                                                        toast.success(`Copiado: ${c.name}`);
                                                    }}>
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-4 border-t pt-4">
                        <Button variant="secondary" onClick={() => setShowResults(false)}>Fechar</Button>
                        {results?.tempCredentials?.length > 0 && (
                            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={downloadCredentials}>
                                <Download className="h-4 w-4" />
                                Baixar Lista de Senhas (.txt)
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
