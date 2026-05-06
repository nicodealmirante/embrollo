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
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-black leading-none text-xl">Puesto #{puesto}</span>
            <Star className="w-5 h-5 text-amber-200 ml-1 mt-1 mr-4" />
            <span className="text-2xl font-black leading-none">{Math.round(puntaje)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-1">Puntos finales</span>
          </div>
        </div>
      </div>


    </div>);

}