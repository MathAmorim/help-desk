import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import NewCategoryButton from "./NewCategoryButton";
import EditCategoryButton from "./EditCategoryButton";

export const dynamic = "force-dynamic";

function getPriorityBadgeClass(priority: string) {
    if (priority === "CRITICA") return "bg-red-600 hover:bg-red-700 text-white";
    if (priority === "ALTA") return "bg-orange-500 hover:bg-orange-600 text-white";
    if (priority === "MEDIA") return "bg-blue-500 hover:bg-blue-600 text-white";
    return "bg-slate-500 hover:bg-slate-600 text-white";
}

export default async function AdminCategoriasPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPORTE")) {
        return (
            <div className="flex justify-center items-center h-48">
                <h2 className="text-xl font-bold">Acesso restrito.</h2>
            </div>
        );
    }

    const categorias = await prisma.category.findMany({
        orderBy: { nome: "asc" }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Categorias de Chamados</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gerencie os tipos de chamados e suas prioridades padrão.
                    </p>
                </div>
                <NewCategoryButton />
            </div>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                    <CardTitle className="text-lg">Gestão de Categorias</CardTitle>
                    <CardDescription>
                        Listando {categorias.length} categorias cadastradas no banco de dados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Nome da Categoria</TableHead>
                                    <TableHead>Prioridade Padrão</TableHead>
                                    <TableHead>SLA (Horas)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categorias.map((cat: any) => (
                                    <TableRow key={cat.id} className="hover:bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                                        <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {cat.id.substring(cat.id.length - 6).toUpperCase()}
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-700 dark:text-slate-300">
                                            {cat.nome}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getPriorityBadgeClass(cat.prioridadePadrao)}>
                                                {cat.prioridadePadrao}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                                            {cat.tempoResolucao || 72}h
                                        </TableCell>
                                        <TableCell>
                                            {cat.ativo ? (
                                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">Ativo</Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">Inativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EditCategoryButton category={cat} />
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
