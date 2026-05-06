import { useState, useEffect } from "react";
import { Timer, AlertCircle } from "lucide-react";
import moment from "moment";

export default function ContadorBanner({ user, config }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [estadoLocal, setEstadoLocal] = useState("inactivo");

  const isActiveGlobal = config?.contador_activo === "true";
  const pausadoManual = config?.contador_pausado_manual === "true";

  useEffect(() => {
    if (!isActiveGlobal) {
      setEstadoLocal("inactivo");
      return;
    }

    if (pausadoManual) {
      setEstadoLocal("pausado_manual");
      return;
    }

    if (!user?.contador_fin) {
      setEstadoLocal("inicial");
      return;
    }

    if (user?.contador_estado === "pausado_manual" && !pausadoManual) {
      setEstadoLocal("activo");
    } else if (user?.contador_estado) {
      setEstadoLocal(user.contador_estado);
    }

    const interval = setInterval(() => {
      if (user?.contador_fin && (estadoLocal === "activo" || user?.contador_estado === "activo")) {
        const now = moment();
        const end = moment(user.contador_fin);
        const diff = end.diff(now);

        if (diff <= 0) {
          setEstadoLocal("vencido");
          setTimeLeft("00:00:00");
        } else {
          const dur = moment.duration(diff);
          const hours = Math.floor(dur.asHours()).toString().padStart(2, '0');
          const mins = dur.minutes().toString().padStart(2, '0');
          const secs = dur.seconds().toString().padStart(2, '0');
          setTimeLeft(`${hours}:${mins}:${secs}`);
          setEstadoLocal("activo");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, config, isActiveGlobal, pausadoManual, estadoLocal]);

  if (!isActiveGlobal || estadoLocal === "inactivo" || estadoLocal === "pausado_manual") return null;

  const isActivo = estadoLocal === "activo";
  const valorActivo = user?.valor_contador_activo || 7000;
  const valorFinal = user?.valor_contado || user?.valor_cuenta || 0;

  if (isActivo && timeLeft) {
    return (
      <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg relative px-5 py-2">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-1.5 opacity-90">
            <Timer className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Valor de la unidad durante contador activo</p>
          </div>
          
          <p className="font-black font-mono tracking-tight drop-shadow-md text-xl my-1">{timeLeft}</p>
          
          <div className="bg-black/20 rounded-2xl backdrop-blur-sm py-1 px-2 mx-2">
            <p className="text-3xl font-black">${parseFloat(valorActivo).toLocaleString("es-AR")}</p>
          </div>
          
          

          
        </div>
      </div>);

  }

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
        <AlertCircle className="w-5 h-5" />
        <p className="text-xs font-bold uppercase tracking-widest">Valor final activo</p>
      </div>
      
      <p className="text-4xl font-black text-slate-800 my-1">${parseFloat(valorFinal).toLocaleString("es-AR")}</p>
      
      <p className="text-xs font-medium text-slate-500 mt-1">
        Hacé un pedido para recuperar el valor especial
      </p>
    </div>);

}