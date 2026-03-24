"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getUnreadNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const router = useRouter();
    const isInitialLoad = useRef(true);
    const notificationsRef = useRef<any[]>([]);

    useEffect(() => {
        setIsMounted(true);
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    async function fetchNotifications() {
        try {
            const data = await getUnreadNotifications();

            if (!isInitialLoad.current) {
                // Detecta apenas as estritamente novas
                const currentNotifs = notificationsRef.current;
                const newItems = data.filter((item: any) => !currentNotifs.find(n => n.id === item.id));
                newItems.forEach((n: any) => {
                    // Toast in-app
                    toast.info("Aviso do Sistema", {
                        description: n.mensagem,
                        action: n.link ? {
                            label: "Ver Chamado",
                            onClick: () => handleMarkAsRead(n.id, n.link)
                        } : undefined,
                    });

                    // Toast do Windows / OS Nativo
                    if ("Notification" in window && Notification.permission === "granted") {
                        try {
                            const osNotif = new Notification("Help Desk", { body: n.mensagem });
                            osNotif.onclick = () => {
                                window.focus();
                                if (n.link) handleMarkAsRead(n.id, n.link);
                            };
                        } catch (e) { }
                    }
                });
            } else {
                isInitialLoad.current = false;
            }

            notificationsRef.current = data;
            setNotifications(data);
        } catch (e) { }
    }

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000); // Polling every 5s
        return () => clearInterval(interval);
    }, []);

    async function handleMarkAsRead(id: string, link: string | null) {
        await markAsRead(id);
        setNotifications(notifications.filter(n => n.id !== id));
        if (link) {
            setOpen(false);
            router.push(link);
        }
    }

    async function handleMarkAllAsRead() {
        await markAllAsRead();
        setNotifications([]);
        setOpen(false);
    }

    if (!isMounted) {
        return (
            <div className="relative flex items-center justify-center h-10 w-10 text-slate-600 dark:text-slate-300 rounded-md hidden sm:flex">
                <Bell className="h-5 w-5" />
            </div>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="relative flex items-center justify-center h-10 w-10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors hidden sm:flex focus:outline-none">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-slate-950">
                        {notifications.length}
                    </span>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 mt-1" align="end">
                <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
                    <h4 className="font-semibold text-sm">Notificações</h4>
                    {notifications.length > 0 && (
                        <button onClick={handleMarkAllAsRead} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            Marcar lidas
                        </button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            Nenhuma notificação não lida.
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {notifications.map((notif: any) => (
                                <li key={notif.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-start cursor-pointer" onClick={() => handleMarkAsRead(notif.id, notif.link)}>
                                    <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 mr-3 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{notif.mensagem}</p>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
