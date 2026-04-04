import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import NewUserButton from "./NewUserButton";
import ResetUserButton from "./ResetUserButton";
import EditUserButton from "./EditUserButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default async function AdminUsersPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        return (
            <div className="flex justify-center items-center h-48">
                <h2 className="text-xl font-bold">Acesso restrito a Administradores.</h2>
            </div>
        );
    }

    // Puxa todos os setores já cadastrados no banco (distintos)
    // Cast para any para ignorar erro de tipo enquanto o prisma generate não conclui
    const usersWithSectors = await (prisma.user as any).findMany({
        where: { setor: { not: null } },
        select: { setor: true },
        distinct: ['setor']
    });

    const sectors = (usersWithSectors as any[])
        .map((u: any) => u.setor)
        .filter((s: any) => s && s.trim().length > 0)
        .sort() as string[];

    const users = await prisma.user.findMany({
        orderBy: { name: "asc" }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Painel Administrativo</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Visualização dos usuários cadastrados no sistema.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/admin/setores">
                        <Button variant="outline" className="h-10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900">
                            Gerenciar Setores
                        </Button>
                    </Link>
                    <NewUserButton sectors={sectors} />
                </div>
            </div>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                    <CardTitle className="text-lg">Gestão de Usuários</CardTitle>
                    <CardDescription>
                        Mostrando todos os {users.length} usuários registrados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Nome / Função</TableHead>
                                    <TableHead>Email / Setor</TableHead>
                                    <TableHead>Perfil</TableHead>
                                    <TableHead>Conta Criada Em</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user: any) => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                                        <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {user.id.substring(user.id.length - 6).toUpperCase()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                                            {user.funcao && <div className="text-xs text-slate-500">{user.funcao}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-slate-600 dark:text-slate-400 text-sm">{user.email || "Sem e-mail"}</div>
                                            {user.setor && <div className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full inline-block mt-1 font-medium">{user.setor}</div>}
                                        </TableCell>
                                        <TableCell>
                                            {user.role === "ADMIN" && <Badge className="bg-red-500">Admin</Badge>}
                                            {user.role === "SUPORTE" && <Badge className="bg-blue-500">Suporte</Badge>}
                                            {user.role === "USUARIO" && <Badge variant="outline">Usuário</Badge>}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                            {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <EditUserButton user={user} sectors={sectors} />
                                            <ResetUserButton userId={user.id} userName={user.name} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
