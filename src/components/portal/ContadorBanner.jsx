import { useState, useEffect } from "react";
import { Timer, AlertTriangle, AlertCircle } from "lucide-react";
import moment from "moment";

export default function ContadorBanner({ user, config }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [estadoLocal, setEstadoLocal] = useState("inactivo"); // activo, vencido, pausado_manual, inactivo, inicial

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

    // Intervalo para actualizar el tiempo real
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

  if (!isActiveGlobal || estadoLocal === "inactivo") return null;

  const getEstilos = () => {
    switch (estadoLocal) {
      case "pausado_manual":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          msg: "Contador detenido temporalmente",
          valor: null
        };
      case "vencido":
        return {
          bg: "bg-red-50 border-red-200 text-red-800",
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          msg: config.contador_mensaje_vencido || "La oferta terminó",
          valor: config.contador_valor_vencido
        };
      case "inicial":
        return {
          bg: "bg-slate-50 border-slate-200 text-slate-800",
          icon: <Timer className="w-5 h-5 text-slate-600" />,
          msg: "Realizá un pedido para iniciar el contador",
          valor: null
        };
      default:
        // Activo
        return {
          bg: "bg-blue-50 border-blue-200 text-blue-800 shadow-sm",
          icon: <Timer className="w-5 h-5 text-blue-600" />,
          msg: config.contador_mensaje_activo || "¡Oferta activa!",
          valor: config.contador_valor_activo
        };
    }
  };

  const estilo = getEstilos();

  return (
    <div className={`mt-4 rounded-2xl border p-4 flex flex-col items-center justify-center text-center gap-2 ${estilo.bg}`}>
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="flex items-center gap-1.5 opacity-90 mb-1">
          {estilo.icon}
          <p className="text-[10px] font-bold uppercase tracking-widest">Cuenta regresiva</p>
        </div>
        
        {estadoLocal === "activo" && timeLeft ? (
          <p className="text-4xl font-black font-mono tracking-tight my-1">{timeLeft}</p>
        ) : (
          <p className="text-base font-bold my-1">{estilo.msg}</p>
        )}
      </div>

      {estadoLocal === "activo" && estilo.valor && parseFloat(estilo.valor) > 0 && (
        <div className="mt-1 bg-white/60 px-3 py-1.5 rounded-lg inline-block">
          <p className="text-[10px] font-semibold opacity-80 uppercase">Valor actual</p>
          <p className="text-xl font-black">${parseFloat(estilo.valor).toLocaleString("es-AR")}</p>
        </div>
      )}

      {estadoLocal === "activo" && (
        <p className="text-[11px] opacity-80 mt-1 font-medium">
          {timeLeft && timeLeft.split(':').length === 3 && parseInt(timeLeft.split(':')[0], 10) >= 23
            ? "Máximo de 24 hs alcanzado"
            : "Tus pedidos suman tiempo automáticamente"}
        </p>
      )}

      {estadoLocal === "vencido" && estilo.valor && parseFloat(estilo.valor) > 0 && (
        <div className="mt-1 bg-white/60 px-3 py-1.5 rounded-lg inline-block">
          <p className="text-[10px] font-semibold opacity-80 uppercase">Valor actual</p>
          <p className="text-xl font-black">${parseFloat(estilo.valor).toLocaleString("es-AR")}</p>
        </div>
      )}
    </div>
  );
}