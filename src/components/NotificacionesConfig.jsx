import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, Save } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NotificacionesConfig({ userEmail }) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications(userEmail);
  const [spKey, setSpKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    base44.auth.me().then(me => {
      if (me?.simplepush_key) setSpKey(me.simplepush_key);
    });
  }, [userEmail]);

  const saveSpKey = async () => {
    setSaving(true);
    await base44.auth.updateMe({ simplepush_key: spKey.trim() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* SimplePush */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-700" />
          <p className="text-sm font-semibold text-blue-800">Notificaciones en tu celular</p>
        </div>
        <p className="text-xs text-blue-700">
          Descargá <strong>SimplePush</strong> y pegá tu key para recibir avisos cuando el administrador te responda.
        </p>
        <a
          href="https://play.google.com/store/apps/details?id=io.simplepush"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📲 Descargar SimplePush
        </a>
        <div className="flex gap-2">
          <Input
            value={spKey}
            onChange={e => setSpKey(e.target.value)}
            placeholder="Tu SimplePush key..."
            className="text-sm font-mono bg-white"
          />
          <Button size="sm" onClick={saveSpKey} disabled={saving} className="shrink-0 gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? "✓" : <Save className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Push notifications toggle */}
      {supported && (
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
      )}
    </div>
  );
}