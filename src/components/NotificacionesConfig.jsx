import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function NotificacionesConfig({ userEmail }) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications(userEmail);

  if (!supported) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${subscribed ? "bg-primary/10" : "bg-muted"}`}>
            {subscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div>
            <p className="text-sm font-semibold">Notificaciones del navegador</p>
            <p className="text-xs text-muted-foreground">
              {subscribed
                ? "Recibirás avisos de pedidos y mensajes"
                : permission === "denied"
                ? "Bloqueadas en el navegador"
                : "Activá para recibir avisos importantes"}
            </p>
          </div>
        </div>

        {permission === "denied" ? (
          <span className="text-xs text-red-500 font-medium">Bloqueadas</span>
        ) : (
          <button
            onClick={subscribed ? unsubscribe : subscribe}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              subscribed ? "bg-primary" : "bg-muted-foreground/30"
            } ${loading ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                subscribed ? "translate-x-6" : "translate-x-1"
              }`}
            />
            {loading && <Loader2 className="absolute inset-0 m-auto w-3 h-3 animate-spin text-white" />}
          </button>
        )}
      </div>
    </div>
  );
}