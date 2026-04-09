import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import NewUserButton from "./NewUserButton";
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Painel Administrativo</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gerenciamento completo de usuários e permissões do sistema.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/dashboard/admin/sla">
                        <Button variant="outline" className="h-10 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm">
                            SLA
                        </Button>
                    </Link>
                    <Link href="/dashboard/admin/auditoria">
                        <Button variant="outline" className="h-10 text-rose-600 dark:text-rose-500 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm">
                            Auditoria
                        </Button>
                    </Link>
                    <Link href="/dashboard/admin/setores">
                        <Button variant="outline" className="h-10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm">
                            Gerenciar Setores
                        </Button>
                    </Link>
                    <NewUserButton sectors={sectors} />
                </div>
            </div>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg">Filtro e Listagem</CardTitle>
                            <CardDescription>
                                Mostrando {users.length} usuários {showInactive ? "registrados (incluindo desativados)" : "ativos"}.
                            </CardDescription>
                        </div>
                        <Link href={`/dashboard/admin${showInactive ? "" : "?showInactive=true"}`}>
                            <Button variant="outline" className="h-9 text-xs font-semibold">
                                {showInactive ? (
                                    <><Users className="h-3.5 w-3.5 mr-1.5" /> Mostrar Apenas Ativos</>
                                ) : (
                                    <><UserMinus className="h-3.5 w-3.5 mr-1.5" /> Ver Usuários Desativados</>
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
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>
                                        <SortButton column="name" label="Nome / Função" />
                                    </TableHead>
                                    <TableHead>Email / Setor</TableHead>
                                    <TableHead>
                                        <SortButton column="role" label="Perfil / Status" />
                                    </TableHead>
                                    <TableHead>
                                        <SortButton column="createdAt" label="Cadastro em" />
                                    </TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            Nenhum usuário encontrado com os filtros atuais.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user: any) => (
                                        <TableRow key={user.id} className={`hover:bg-slate-50/50 dark:bg-slate-900/50 transition-colors ${!user.ativo ? "opacity-60 grayscale-[0.5]" : ""}`}>
                                            <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {user.id.substring(user.id.length - 6).toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                                                {user.funcao && <div className="text-xs text-slate-500 font-medium">{user.funcao}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-slate-600 dark:text-slate-400 text-sm">{user.email || "Sem e-mail"}</div>
                                                {user.setor && <div className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full inline-block mt-1 font-medium">{user.setor}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex gap-1">
                                                        {user.role === "ADMIN" && <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>}
                                                        {user.role === "SUPORTE" && <Badge className="bg-blue-500 hover:bg-blue-600">Suporte</Badge>}
                                                        {user.role === "USUARIO" && <Badge variant="outline">Usuário</Badge>}
                                                    </div>
                                                    {!user.ativo && <Badge variant="destructive" className="w-fit text-[10px] py-0 h-4">DESATIVADO</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <EditUserButton user={user} sectors={sectors} />
                                                <ResetUserButton userId={user.id} userName={user.name} />
                                                <DeactivateUserButton userId={user.id} userName={user.name} isAtivo={user.ativo} />
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
