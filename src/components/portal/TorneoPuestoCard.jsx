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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm py-5 px-10">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2 mt-2 text-[hsl(var(--foreground))] ml-8">
            <span className="font-black leading-none text-3xl text-center">Puesto #{puesto}</span>
            <Star className="w-5 h-5 text-amber-200 mt-1 ml-10 mr-6" />
            <span className="text-2xl font-black leading-none">{Math.round(puntaje)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-1">PUNTOS</span>
          </div>
        </div>
      </div>


    </div>);

}