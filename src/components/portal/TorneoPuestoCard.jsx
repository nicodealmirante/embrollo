import { Trophy, Star } from "lucide-react";
import { calcularRankingSemanal } from "@/lib/torneoSemanal";

export default function TorneoPuestoCard({ user, users = [], pedidos = [], pagos = [], config = {} }) {
  if (config.torneo_activo === "false") return null;

  if (user?.role === "admin") {
    return null;
  }

  const ranking = calcularRankingSemanal(users, pedidos, pagos, config);
  const miPuesto = ranking.find((r) => r.email === user?.email);
  const puesto = miPuesto?.puesto || "-";
  const puntaje = miPuesto?.puntaje || 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 shadow-sm">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 opacity-90 mb-1">
            <Trophy className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Torneo Semanal</p>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black leading-none">Puesto #{puesto}</span>
          </div>
        </div>
        <div className="text-right pl-3 shrink-0">
          <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-3 min-w-[80px]">
            <Star className="w-5 h-5 text-amber-200 mb-1" />
            <span className="text-2xl font-black leading-none">{Math.round(puntaje)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-1">Puntos Semanales</span>
          </div>
        </div>
      </div>

      {config.torneo_ranking_general_visible === "true" && ranking.length > 0 && (
        <div className="relative mt-4 rounded-2xl bg-black/10 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider opacity-90">Ranking Top</p>
          <div className="space-y-1.5">
            {ranking.slice(0, 10).map((r) => (
              <div key={r.email} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${r.email === user.email ? 'bg-white/20 font-bold' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="w-5 font-bold opacity-80">#{r.puesto}</span>
                  <span className="truncate max-w-[140px]">{r.nombre.split(' ')[0]}</span>
                </div>
                {/* Mostrar puntos sólo del usuario */}
                <span className="font-semibold opacity-90">{r.email === user.email ? Math.round(r.puntaje) + ' pts' : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}