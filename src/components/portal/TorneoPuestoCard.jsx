import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { calcularRankingSemanal } from "@/lib/torneoSemanal";

function getMovimiento(actual, anterior) {
  if (!actual || !anterior) return { label: "Semana en curso", icon: Sparkles, className: "text-primary", texto: "Seguí sumando para subir." };
  if (actual < anterior) return { label: "Subiste de puesto", icon: TrendingUp, className: "text-green-600", texto: `Venías #${anterior}.` };
  if (actual > anterior) return { label: "Bajaste de puesto", icon: TrendingDown, className: "text-amber-600", texto: `Venías #${anterior}.` };
  return { label: "Te mantenés", icon: Minus, className: "text-muted-foreground", texto: `Seguís #${actual}.` };
}

export default function TorneoPuestoCard({ user, users = [], pedidos = [], pagos = [] }) {
  const ranking = calcularRankingSemanal(users, pedidos, pagos);
  const miPuesto = ranking.find((r) => r.email === user?.email);
  const puesto = miPuesto?.puesto || "-";

  const puestoAnterior = Number(localStorage.getItem(`embrollo_torneo_puesto_${user?.email}`)) || null;
  const movimiento = getMovimiento(Number(puesto), puestoAnterior);
  const MovimientoIcon = movimiento.icon;

  if (miPuesto?.puesto) {
    localStorage.setItem(`embrollo_torneo_puesto_${user.email}`, String(miPuesto.puesto));
  }

  const esPrimero = miPuesto?.puesto === 1;
  const rankingVisible = ranking.slice(0, 10);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Torneo semanal</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-black leading-none">#{puesto}</span>
            {esPrimero && <Trophy className="mb-1 h-7 w-7 text-amber-500 animate-bounce" />}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Estás en el puesto {puesto}</p>
        </div>

        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${esPrimero ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
          {esPrimero ? <Trophy className="h-8 w-8" /> : <Medal className="h-8 w-8" />}
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl border bg-background/70 p-3">
        <div className="flex items-center gap-2">
          <MovimientoIcon className={`h-4 w-4 ${movimiento.className}`} />
          <p className={`text-sm font-bold ${movimiento.className}`}>{movimiento.label}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{movimiento.texto}</p>
      </div>

      <div className="relative mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Puestos</p>
        {rankingVisible.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">Todavía no hay puestos esta semana.</div>
        ) : (
          rankingVisible.map((item) => {
            const soyYo = item.email === user?.email;
            return (
              <div key={item.email} className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${soyYo ? "border-primary bg-primary/10" : "bg-background/70"}`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${item.puesto === 1 ? "bg-amber-100 text-amber-700" : "bg-muted text-foreground"}`}>#{item.puesto}</span>
                  <span className="text-sm font-semibold">{item.nombre}</span>
                </div>
                {item.puesto === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
