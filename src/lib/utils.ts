import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: Date | string) {
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const now = new Date();
  const past = new Date(date);
  const diffInMs = past.getTime() - now.getTime();

  const diffInMinutes = Math.round(diffInMs / (1000 * 60));
  if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute');

  const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));
  if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour');

  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffInDays) < 30) return rtf.format(diffInDays, 'day');

  const diffInMonths = Math.round(diffInMs / (1000 * 60 * 60 * 24 * 30));
  return rtf.format(diffInMonths, 'month');
}

/**
 * Remove acentos e converte para minúsculas para busca insensível a diacríticos.
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
