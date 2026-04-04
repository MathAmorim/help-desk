"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { migrateSector, updateUserSector } from "@/app/actions/sectors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Building2, PencilLine, Loader2, Info, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface UserInfo {
    id: string;
    name: string;
    email: string;
    role: string;
    setor: string | null;
}

interface SectorInfo {
    name: string;
    users: UserInfo[];
    count: number;
}

export default function SectorClient({ initialSectors }: { initialSectors: SectorInfo[] }) {
    const router = useRouter();
    const [sectors, setSectors] = useState<SectorInfo[]>(initialSectors);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Setores</h2>
                    <p className="text-slate-500 dark:text-slate-400">Pela interface abaixo você pode auditar e migrar usuários para padronizar as tabelas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectors.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        Nenhum setor orgânico encontrado no banco de dados.
                    </div>
                )}
                {sectors.map((sector) => (
                    <SectorCard key={sector.name} sector={sector} allSectors={sectors.map(s => s.name)} />
                ))}
            </div>
        </div>
    );
}

function SectorCard({ sector, allSectors }: { sector: SectorInfo, allSectors: string[] }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [newSectorName, setNewSectorName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleMigrate(e: React.FormEvent) {
        e.preventDefault();

        if (!newSectorName || newSectorName.trim() === sector.name) {
            toast.error("Digite um nome de setor diferente para migrar.");
            return;
        }

        if (!window.confirm(`Tem certeza que deseja transferir definitivamente os ${sector.count} funcionários para o setor "${newSectorName.trim()}"?`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            await migrateSector(sector.name, newSectorName.trim());
            toast.success(`Todos os usuários migrados de '${sector.name}' para '${newSectorName.trim()}' com sucesso!`);
            setIsOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao migrar setor.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/20">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-500" />
                            {sector.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {sector.count} {sector.count === 1 ? 'usuário anexado' : 'usuários anexados'}
                        </CardDescription>
                    </div>

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
                            <PencilLine className="h-4 w-4 mr-2 text-slate-500" />
                            Gerenciar
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Building2 className="h-5 w-5 text-indigo-500" />
                                    Gerenciando Setor: {sector.name}
                                </DialogTitle>
                                <DialogDescription>
                                    Renomeie ou mova funcionários individualmente. Se este setor possuir erros de digitação, você também pode usar a ferramenta de migração em massa no final do painel.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                <div className="space-y-4">
                                    <h4 className="text-sm border-b pb-2 font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Membros Atuais ({sector.count})
                                    </h4>
                                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 border rounded-md p-2 bg-slate-50 dark:bg-slate-900">
                                        {sector.users.map((user) => (
                                            <UserInlineRow key={user.id} user={user} allSectors={allSectors} />
                                        ))}
                                    </div>
                                </div>

                                <form onSubmit={handleMigrate} className="mt-8 pt-6 border-t border-dashed">
                                    <h4 className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                        <Info className="h-4 w-4" />
                                        Ferramenta de Mesclagem em Massa
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                        Atenção: Ao confirmar a alteração abaixo, os {sector.count} funcionários listados serão transferidos em lote para o novo setor especificado.
                                    </p>
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="rename">Onde juntar todos eles?</Label>
                                        <Input
                                            id="rename"
                                            value={newSectorName}
                                            onChange={(e) => setNewSectorName(e.target.value)}
                                            placeholder="Digite ou clique num setor existente..."
                                            required
                                            list="sector-options"
                                        />
                                        <datalist id="sector-options">
                                            {allSectors.filter(s => s !== sector.name).map(s => (
                                                <option key={s} value={s} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting || !newSectorName || newSectorName.trim() === sector.name}>
                                            {isSubmitting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Migrando Todos...</>
                                            ) : (
                                                "Migrar Todo o Grupo"
                                            )}
                                        </Button>
                                    </div>
                                </form>

                            </div>
                        </DialogContent>
                    </Dialog>

                </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
                <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Principais Membros</p>
                    <div className="flex flex-wrap gap-2">
                        {sector.users.slice(0, 5).map(u => (
                            <span key={u.id} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded border">
                                {u.name.split(' ')[0]}
                            </span>
                        ))}
                        {sector.count > 5 && (
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-medium border border-indigo-100 dark:border-indigo-900">
                                +{sector.count - 5}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function UserInlineRow({ user, allSectors }: { user: UserInfo, allSectors: string[] }) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [sectorValue, setSectorValue] = useState(user.setor || "");
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        if (sectorValue === user.setor) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await updateUserSector(user.id, sectorValue);
            toast.success("Setor do usuário atualizado!");
            setIsEditing(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar setor.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded bg-white dark:bg-slate-950 border shadow-sm gap-2">
            <div className="font-medium text-sm text-slate-800 dark:text-slate-200 flex flex-col flex-1">
                <span>{user.name}</span>
                <span className="text-xs text-slate-500 font-normal">{user.email}</span>
            </div>

            <div className="flex items-center gap-2">
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <Input
                            className="h-7 text-xs w-32 md:w-40"
                            value={sectorValue}
                            onChange={e => setSectorValue(e.target.value)}
                            list={`list-${user.id}`}
                            autoFocus
                        />
                        <datalist id={`list-${user.id}`}>
                            {allSectors.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                    </div>
                ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setIsEditing(true)}>
                        <PencilLine className="h-3 w-3 mr-1" /> Editar
                    </Button>
                )}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {user.role}
                </span>
            </div>
        </div>
    );
}
