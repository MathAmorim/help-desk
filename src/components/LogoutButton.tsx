"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    return (
        <Button variant="outline" size="sm" className="h-9 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 transition-all hover:scale-105 active:scale-95 shadow-sm" onClick={() => {
            signOut({ redirect: false }).then(() => {
                window.location.href = "/login";
            });
        }}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
        </Button>
    );
}
