import { Trophy, Star } from "lucide-react";
import { calcularRankingSemanal } from "@/lib/torneoSemanal";

export default function TorneoPuestoCard({ user, users = [], pedidos = [], pagos = [], config = {} }) {
  if (config.torneo_activo === "false") return null;

  const ranking = calcularRankingSemanal(users, pedidos, pagos);
  const miPuesto = ranking.find((r) => r.email === user?.email);
  const puesto = miPuesto?.puesto || "-";
  const puntaje = miPuesto?.puntaje || 0;
  const esPrimero = miPuesto?.puesto === 1;

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
          {esPrimero ? (
            <p className="text-sm font-bold mt-2 bg-white/20 inline-block px-2 py-0.5 rounded-full">¡Vas primero!</p>
          ) : (
            <p className="text-sm font-medium mt-1 opacity-90">
              {puesto === "-" ? "Sin puntos esta semana" : "¡Seguí sumando!"}
            </p>
          )}
        </div>
        <div className="text-right pl-3 shrink-0">
          <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-3 min-w-[80px]">
            <Star className="w-5 h-5 text-amber-200 mb-1" />
            <span className="text-2xl font-black leading-none">{Math.round(puntaje)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-1">Puntos</span>
          </div>
        </div>
      </div>
    </div>
  );
}