import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import NewUserButton from "./NewUserButton";
import InviteUserButton from "./InviteUserButton";
import ResetUserButton from "./ResetUserButton";
import EditUserButton from "./EditUserButton";
import DeactivateUserButton from "./DeactivateUserButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, UserMinus } from "lucide-react";

import UserFilters from "./UserFilters";
import SortButton from "./SortButton";
import { normalizeSearchText } from "@/lib/utils";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ showInactive?: string; q?: string; sortBy?: string; order?: string }> }) {
    const session = await getServerSession(authOptions);
    const resolvedParams = await searchParams;
    const showInactive = resolvedParams.showInactive === "true";
    const q = resolvedParams.q || "";
    const sortBy = resolvedParams.sortBy || "name";
    const order = (resolvedParams.order === "desc" ? "desc" : "asc") as "asc" | "desc";

    if (!session || session.user.role !== "ADMIN") {
        return (
            <div className="flex justify-center items-center h-48">
                <h2 className="text-xl font-bold">Acesso restrito a Administradores.</h2>
            </div>
        );
    }

    // Puxa todos os setores já cadastrados no banco (distintos)
    const usersWithSectors = await (prisma.user as any).findMany({
        where: { setor: { not: null } },
        select: { setor: true },
        distinct: ['setor']
    });

    const sectors = (usersWithSectors as any[])
        .map((u: any) => u.setor)
        .filter((s: any) => s && s.trim().length > 0)
        .sort() as string[];

    const where: any = {
        AND: []
    };

    if (!showInactive) {
        where.AND.push({ ativo: true });
    }

    if (q) {
        const normalizedQ = normalizeSearchText(q);
        where.AND.push({
            OR: [
                { searchVector: { contains: normalizedQ } },
                { cpf: { contains: q } }
            ]
        });
    }

    const users = await prisma.user.findMany({
        where,
        orderBy: { [sortBy]: order }
    });
    return (
        <div className="space-y-6 px-2 sm:px-0">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="w-full lg:w-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel Administrativo</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                        Gerenciamento completo de usuários e permissões.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Link href="/dashboard/admin/sla" className="flex-1 min-w-[70px] sm:flex-initial">
                        <Button variant="outline" className="w-full h-10 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900 font-bold transition-all shadow-sm text-xs sm:text-sm">
                            SLA
                        </Button>
                    </Link>
                    <Link href="/dashboard/admin/auditoria" className="flex-1 min-w-[80px] sm:flex-initial">
                        <Button variant="outline" className="w-full h-10 text-rose-600 dark:text-rose-500 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 font-bold transition-all shadow-sm text-xs sm:text-sm">
                            <span className="sm:hidden">Audit</span>
                            <span className="hidden sm:inline">Auditoria</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/admin/setores" className="flex-1 min-w-[80px] sm:flex-initial">
                        <Button variant="outline" className="w-full h-10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all shadow-sm text-xs sm:text-sm">
                            Setores
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-[110px] sm:flex-initial">
                        <InviteUserButton />
                    </div>
                    <div className="flex-1 min-w-[110px] sm:flex-initial">
                        <NewUserButton sectors={sectors} />
                    </div>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg">Filtro e Listagem</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Mostrando {users.length} usuários {showInactive ? "registrados" : "ativos"}.
                            </CardDescription>
                        </div>
                        <Link href={`/dashboard/admin${showInactive ? "" : "?showInactive=true"}`} className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full h-9 text-xs font-semibold">
                                {showInactive ? (
                                    <><Users className="h-3.5 w-3.5 mr-1.5" /> Apenas Ativos</>
                                ) : (
                                    <><UserMinus className="h-3.5 w-3.5 mr-1.5" /> Desativados</>
                                )}
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <UserFilters />
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow>
                                    <TableHead className="w-[60px] hidden xl:table-cell text-center">ID</TableHead>
                                    <TableHead>
                                        <SortButton column="name" label="Nome" />
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell text-center">Setor</TableHead>
                                    <TableHead className="text-center">
                                        <SortButton column="role" label="Status" />
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell text-center">
                                        <SortButton column="createdAt" label="Cadastro" />
                                    </TableHead>
                                    <TableHead className="text-right pr-4 sm:pr-6">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user: any) => (
                                        <TableRow key={user.id} className={`hover:bg-slate-50/50 dark:bg-slate-900/50 transition-colors ${!user.ativo ? "opacity-60 grayscale-[0.5]" : ""}`}>
                                            <TableCell className="font-mono text-[10px] text-slate-500 dark:text-slate-400 hidden xl:table-cell text-center">
                                                {user.id.substring(user.id.length - 4).toUpperCase()}
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">
                                                        {user.name}
                                                    </span>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 mt-0.5 text-[11px] sm:text-xs text-slate-500 font-medium">
                                                        <span className="truncate max-w-[150px]">{user.funcao || "Sem função"}</span>
                                                        <span className="hidden sm:inline text-slate-300">•</span>
                                                        <span className="md:hidden text-indigo-600/70 dark:text-indigo-400/70">{user.setor || "Sem setor"}</span>
                                                        <span className="sm:hidden text-slate-400 lowercase">{user.email || ""}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-center">
                                                {user.setor ? (
                                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                                                        {user.setor}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">---</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {user.role === "ADMIN" && <Badge className="bg-red-500 hover:bg-red-600 text-[10px] py-0 px-1.5 h-5 uppercase font-bold">Admin</Badge>}
                                                    {user.role === "SUPORTE" && <Badge className="bg-blue-500 hover:bg-blue-600 text-[10px] py-0 px-1.5 h-5 uppercase font-bold">Técnico</Badge>}
                                                    {user.role === "USUARIO" && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 uppercase font-bold text-slate-500">User</Badge>}
                                                    {!user.ativo && <span className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase leading-none">Inativo</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-center text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(user.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}
                                            </TableCell>
                                            <TableCell className="text-right pr-4 sm:pr-6">
                                                <div className="flex justify-end items-center gap-0.5 sm:gap-1">
                                                    <EditUserButton user={user} sectors={sectors} />
                                                    <div className="hidden sm:block">
                                                        <ResetUserButton userId={user.id} userName={user.name} />
                                                    </div>
                                                    <DeactivateUserButton userId={user.id} userName={user.name} isAtivo={user.ativo} />
                                                </div>
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
