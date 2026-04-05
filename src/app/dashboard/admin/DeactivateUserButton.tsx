"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserX, UserCheck, Loader2 } from "lucide-react";
import { deactivateUser, reactivateUser } from "@/app/actions/users";
import { toast } from "sonner";

interface DeactivateUserButtonProps {
    userId: string;
    userName: string;
    isAtivo: boolean;
}

export default function DeactivateUserButton({ userId, userName, isAtivo }: DeactivateUserButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleToggleStatus() {
        setIsLoading(true);
        try {
            if (isAtivo) {
                await deactivateUser(userId);
                toast.success(`Usuário ${userName} desativado com sucesso.`);
            } else {
                await reactivateUser(userId);
                toast.success(`Usuário ${userName} reativado com sucesso.`);
            }
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Erro ao alterar status do usuário.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button 
                    variant="outline" 
                    size="icon" 
                    className={`h-8 w-8 transition-all hover:scale-110 shadow-sm ${
                        isAtivo 
                        ? "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900" 
                        : "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                    }`}
                    title={isAtivo ? "Desativar Usuário" : "Reativar Usuário"}
                    type="button"
                />
            }>
                {isAtivo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isAtivo ? "Desativar Usuário" : "Reativar Usuário"}</DialogTitle>
                    <DialogDescription>
                        {isAtivo 
                            ? `Tem certeza que deseja desativar a conta de ${userName}? O usuário será impedido de realizar login, mas seu histórico será preservado.`
                            : `Deseja reativar a conta de ${userName}? O usuário poderá realizar login novamente.`
                        }
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 sm:justify-end mt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleToggleStatus} 
                        disabled={isLoading}
                        variant="outline"
                        className={`h-10 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm ${
                            isAtivo 
                            ? "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900" 
                            : "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                        }`}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isAtivo ? "Confirmar Desativação" : "Confirmar Reativação"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
