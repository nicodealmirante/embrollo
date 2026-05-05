import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Timer, Settings2, PackageMinus, RefreshCw } from "lucide-react";

const DEFAULTS = {
  contador_activo: "false",
  contador_duracion_minutos: "60",
  contador_valor_activo: "0",
  contador_valor_vencido: "0",
  contador_pausado_manual: "false",
  contador_mensaje_activo: "¡Oferta especial disponible!",
  contador_mensaje_vencido: "El tiempo expiró. Sigue comprando al precio normal.",
};

export default function ContadorConfigTab() {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const configsData = await base44.entities.ConfigApp.list().catch(() => []);
    const cfg = { ...DEFAULTS };
    configsData.forEach((c) => {
      if (c?.clave && Object.keys(DEFAULTS).includes(c.clave)) {
        cfg[c.clave] = String(c.valor);
      }
    });
    setConfig(cfg);
    setLoading(false);
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const existentes = await base44.entities.ConfigApp.list().catch(() => []);
      for (const [clave, valor] of Object.entries(config)) {
        const actual = existentes.find((c) => c.clave === clave);
        if (actual) await base44.entities.ConfigApp.update(actual.id, { valor: String(valor) });
        else await base44.entities.ConfigApp.create({ clave, valor: String(valor) });
      }
      toast({ title: "Configuración guardada" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
    setSaving(false);
  }

  const setBool = (key, value) => setConfig((c) => ({ ...c, [key]: value ? "true" : "false" }));

  if (loading) return <div className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cuenta regresiva</p>
            <h2 className="text-xl font-black">Contador promocional</h2>
            <p className="text-sm text-muted-foreground">
              Configurá un tiempo límite para precios especiales cuando los usuarios realizan un pedido.
            </p>
          </div>
          <Timer className="h-8 w-8 text-primary" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToggleCard title="Contador general activo" value={config.contador_activo === "true"} onChange={(v) => setBool("contador_activo", v)} />
          
          <div className="rounded-2xl border p-4 flex flex-col justify-center bg-background">
            <Label className="text-xs mb-2">Control manual</Label>
            {config.contador_pausado_manual === "true" ? (
              <Button onClick={() => setConfig(c => ({ ...c, contador_pausado_manual: "false" }))} className="bg-green-600 hover:bg-green-700 w-full h-10">
                Reactivar contador
              </Button>
            ) : (
              <Button onClick={() => setConfig(c => ({ ...c, contador_pausado_manual: "true" }))} variant="destructive" className="w-full h-10">
                Detener contador
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div className="rounded-2xl border p-4 bg-muted/40">
            <Label className="text-xs font-semibold">Duración del contador</Label>
            <p className="text-sm font-bold text-primary mt-1">1 unidad suma 1 hora. Máximo: 24 hs.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los pedidos acumulan tiempo automáticamente en el contador del usuario.
            </p>
          </div>
        </div>



        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Mensaje para el usuario (ACTIVO)</Label>
            <Input value={config.contador_mensaje_activo} onChange={(e) => setConfig((c) => ({ ...c, contador_mensaje_activo: e.target.value }))} className="mt-1" placeholder="¡Oferta por tiempo limitado!" />
          </div>
          <div>
            <Label className="text-xs">Mensaje para el usuario (VENCIDO)</Label>
            <Input value={config.contador_mensaje_vencido} onChange={(e) => setConfig((c) => ({ ...c, contador_mensaje_vencido: e.target.value }))} className="mt-1" placeholder="La oferta terminó" />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={saveConfig} disabled={saving} className="gap-2 w-full"><Settings2 className="h-4 w-4" />{saving ? "Guardando..." : "Guardar ajustes del contador"}</Button>
        </div>
      </div>
    </div>
  );
}

function ToggleCard({ title, value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className={`rounded-2xl border p-4 text-left transition ${value ? "border-primary bg-primary/10" : "bg-background"}`}>
      <p className="text-sm font-bold">{title}</p>
      <p className={`mt-1 text-xs font-semibold ${value ? "text-primary" : "text-muted-foreground"}`}>{value ? "Activado" : "Desactivado"}</p>
    </button>
  );
}