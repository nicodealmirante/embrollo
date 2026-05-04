import { useEffect } from "react";
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Sparkles, Volume2, Crown } from "lucide-react";
import { calcularRankingSemanal } from "@/lib/torneoSemanal";

function getMovimiento(actual, anterior) {
  if (!actual || !anterior) return { label: "Semana en curso", icon: Sparkles, className: "text-primary", texto: "Seguí sumando para subir.", tipo: "neutral" };
  if (actual < anterior) return { label: "Subiste de puesto", icon: TrendingUp, className: "text-green-600", texto: `Venías #${anterior}.`, tipo: "subio" };
  if (actual > anterior) return { label: "Bajaste de puesto", icon: TrendingDown, className: "text-amber-600", texto: `Venías #${anterior}.`, tipo: "bajo" };
  return { label: "Te mantenés", icon: Minus, className: "text-muted-foreground", texto: `Seguís #${actual}.`, tipo: "igual" };
}

function playTone(frequency, startTime, duration, audioCtx, gainNode) {
  const oscillator = audioCtx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.connect(gainNode);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playTorneoSound(type = "subio") {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.14, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.65);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === "primero") {
      playTone(523.25, now, 0.12, audioCtx, gainNode);
      playTone(659.25, now + 0.13, 0.12, audioCtx, gainNode);
      playTone(783.99, now + 0.26, 0.18, audioCtx, gainNode);
      playTone(1046.5, now + 0.45, 0.18, audioCtx, gainNode);
    } else if (type === "subio") {
      playTone(440, now, 0.12, audioCtx, gainNode);
      playTone(587.33, now + 0.14, 0.12, audioCtx, gainNode);
      playTone(739.99, now + 0.28, 0.16, audioCtx, gainNode);
    }
    setTimeout(() => audioCtx.close().catch(() => {}), 900);
  } catch {}
}

export default function TorneoPuestoCard({ user, users = [], pedidos = [], pagos = [], config = {} }) {
  const ranking = calcularRankingSemanal(users, pedidos, pagos);
  const miPuesto = ranking.find((r) => r.email === user?.email);
  const puesto = miPuesto?.puesto || "-";
  const storageKey = `embrollo_torneo_puesto_${user?.email}`;
  const puestoAnterior = Number(localStorage.getItem(storageKey)) || null;
  const movimiento = getMovimiento(Number(puesto), puestoAnterior);
  const MovimientoIcon = movimiento.icon;
  const esPrimero = miPuesto?.puesto === 1;
  const rankingVisible = ranking.slice(0, 10);
  const premioTexto = miPuesto?.deuda > 0 
    ? `$${Number(config.torneo_premio_descuento_deuda || 80000).toLocaleString("es-AR")} de descuento en tu deuda` 
    : `${config.torneo_premio_unidades || 80} unidades`;

  useEffect(() => {
    if (!user?.email || !miPuesto?.puesto) return;
    const last = Number(localStorage.getItem(storageKey)) || null;
    const current = Number(miPuesto.puesto);
    if (config.torneo_sonidos !== "false") {
      if (last && current < last) playTorneoSound(current === 1 ? "primero" : "subio");
      if (!last && current === 1) playTorneoSound("primero");
    }
    localStorage.setItem(storageKey, String(current));
  }, [user?.email, miPuesto?.puesto, config.torneo_sonidos]);

  return (
    <div className="space-y-3">
      {esPrimero && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 p-5 shadow-sm">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-300/40 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-200 text-amber-800 shadow-inner">
              <Crown className="h-9 w-9 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Ganaste</p>
              <h2 className="text-2xl font-black text-amber-950">Vas primero en el torneo</h2>
              <p className="mt-1 text-sm font-semibold text-amber-800">Si cerrás la semana así, ganás {premioTexto}.</p>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MovimientoIcon className={`h-4 w-4 ${movimiento.className}`} />
              <p className={`text-sm font-bold ${movimiento.className}`}>{movimiento.label}</p>
            </div>
            {(movimiento.tipo === "subio" || esPrimero) && <Volume2 className="h-4 w-4 text-primary" />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{movimiento.texto}</p>
        </div>

        {config.torneo_ranking_visible !== "false" && (
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
        )}
      </div>
    </div>
  );
}