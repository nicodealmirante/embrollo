import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, RefreshCw, Play, Settings2 } from "lucide-react";
import { calcularRankingSemanal, PREMIO_TORNEO_UNIDADES, PREMIO_TORNEO_DESCUENTO_DEUDA } from "@/lib/torneoSemanal";
import { useToast } from "@/components/ui/use-toast";

const DEFAULTS = {
  torneo_activo: "true",
  torneo_sonidos: "true",
  torneo_ranking_visible: "true",
  torneo_ranking_general_visible: "true",
  torneo_premio_unidades: String(PREMIO_TORNEO_UNIDADES),
  torneo_premio_descuento_deuda: String(PREMIO_TORNEO_DESCUENTO_DEUDA),
};

export default function TorneoConfigTab() {
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [usersData, pedidosData, pagosData, configsData] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Pedido.list(),
      base44.entities.Pago.list(),
      base44.entities.ConfigApp.list().catch(() => []),
    ]);

    const cfg = { ...DEFAULTS };
    configsData.forEach((c) => {
      if (c?.clave && c.valor !== undefined) cfg[c.clave] = String(c.valor);
    });

    setUsers(usersData);
    setPedidos(pedidosData);
    setPagos(pagosData);
    setConfig(cfg);
    setLoading(false);
  }

  const ranking = useMemo(() => calcularRankingSemanal(users, pedidos, pagos), [users, pedidos, pagos]);
  const ganador = ranking[0];

  async function saveConfig() {
    setSaving(true);
    try {
      const existentes = await base44.entities.ConfigApp.list().catch(() => []);
      for (const [clave, valor] of Object.entries(config)) {
        const actual = existentes.find((c) => c.clave === clave);
        if (actual) await base44.entities.ConfigApp.update(actual.id, { valor });
        else await base44.entities.ConfigApp.create({ clave, valor });
      }
      toast({ title: "Torneo guardado" });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar configuración", variant: "destructive" });
    }
    setSaving(false);
  }

  async function ejecutarPremio() {
    setRunning(true);
    try {
      const res = await base44.functions.cronPremioTorneo({});
      toast({ title: "Premio ejecutado", description: res?.data?.skipped ? res.data.reason : "Se aplicó el premio semanal" });
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudo ejecutar el premio", variant: "destructive" });
    }
    setRunning(false);
  }

  const setBool = (key, value) => setConfig((c) => ({ ...c, [key]: value ? "true" : "false" }));

  if (loading) return <div className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">Cargando torneo...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Torneo semanal</p>
            <h2 className="text-xl font-black">Configuración y ranking</h2>
            <p className="text-sm text-muted-foreground">Puntaje: ventas entregadas de la semana menos deuda actual.<br/>Semana actual: lunes 00:00 a domingo 23:59</p>
          </div>
          <Trophy className="h-8 w-8 text-amber-500" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToggleCard title="Torneo activo" value={config.torneo_activo === "true"} onChange={(v) => setBool("torneo_activo", v)} />
          <ToggleCard title="Sonidos" value={config.torneo_sonidos === "true"} onChange={(v) => setBool("torneo_sonidos", v)} />
          <ToggleCard title="Ranking visible" value={config.torneo_ranking_visible === "true"} onChange={(v) => setBool("torneo_ranking_visible", v)} />
          <ToggleCard title="Ranking general visible" value={config.torneo_ranking_general_visible === "true"} onChange={(v) => setBool("torneo_ranking_general_visible", v)} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Premio si está al día (unidades)</Label>
            <Input value={config.torneo_premio_unidades} onChange={(e) => setConfig((c) => ({ ...c, torneo_premio_unidades: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Descuento si tiene deuda ($)</Label>
            <Input value={config.torneo_premio_descuento_deuda} onChange={(e) => setConfig((c) => ({ ...c, torneo_premio_descuento_deuda: e.target.value }))} className="mt-1" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveConfig} disabled={saving} className="gap-2"><Settings2 className="h-4 w-4" />{saving ? "Guardando..." : "Guardar ajustes"}</Button>
          <Button onClick={ejecutarPremio} disabled={running} variant="outline" className="gap-2"><Play className="h-4 w-4" />{running ? "Ejecutando..." : "Ejecutar premio"}</Button>
          <Button onClick={loadData} variant="ghost" className="gap-2"><RefreshCw className="h-4 w-4" />Refrescar</Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Ranking admin</h3>
            <p className="text-xs text-muted-foreground">Acá sí se ven métricas completas para control interno.</p>
          </div>
          {ganador && <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">#1 {ganador.nombre}</div>}
        </div>

        <div className="space-y-2">
          {ranking.map((item) => (
            <div key={item.email} className="grid grid-cols-[54px_1fr] gap-3 rounded-2xl border bg-background p-3 sm:grid-cols-[54px_1fr_repeat(4,120px)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-black">#{item.puesto}</div>
              <div><p className="font-semibold">{item.nombre}</p><p className="text-xs text-muted-foreground">{item.email}</p></div>
              <Metric label="Productos" value={item.productosVendidos} />
              <Metric label="Generado" value={`$${Math.round(item.generado).toLocaleString("es-AR")}`} />
              <Metric label="Deuda" value={`$${Math.round(item.deuda).toLocaleString("es-AR")}`} />
              <Metric label="Puntaje" value={`$${Math.round(item.puntaje).toLocaleString("es-AR")}`} />
            </div>
          ))}
          {ranking.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay usuarios en el torneo.</p>}
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

function Metric({ label, value }) {
  return <div className="hidden sm:block"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-sm font-bold">{value}</p></div>;
}