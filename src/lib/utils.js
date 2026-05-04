import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export const isIframe = window.self !== window.top;

export function getNombreVisible(userOrRecord) {
  if (!userOrRecord) return "—";
  return userOrRecord.nombre_visible || userOrRecord.link_titulo || userOrRecord.full_name || userOrRecord.usuario_nombre || userOrRecord.usuario_email || userOrRecord.email || "—";
}