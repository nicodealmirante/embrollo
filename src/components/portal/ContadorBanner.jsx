import { useState, useEffect } from "react";
import { Timer, AlertTriangle, AlertCircle } from "lucide-react";
import moment from "moment";

export default function ContadorBanner({ user, config }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [estadoLocal, setEstadoLocal] = useState("inactivo"); // activo, vencido, pausado_sin_stock, inactivo

  const isActiveGlobal = config?.contador_activo === "true";
  const pausarSinStock = config?.contador_pausar_sin_stock === "true";
  const stock = parseFloat(config?.contador_stock_actual || 0);
  const pausadoManual = config?.contador_pausado_manual === "true";

  useEffect(() => {
    if (!isActiveGlobal || !user?.contador_inicio) {
      setEstadoLocal("inactivo");
      return;
    }

    if (pausadoManual || (pausarSinStock && stock <= 0)) {
      setEstadoLocal("pausado_sin_stock");
      return;
    }

    if (user?.contador_estado === "pausado_sin_stock" && !pausadoManual && (!pausarSinStock || stock > 0)) {
      // Debería continuarlo backend idealmente, pero asumimos "activo" frontend
      setEstadoLocal("activo");
    } else if (user?.contador_estado) {
      setEstadoLocal(user.contador_estado);
    }

    // Intervalo para actualizar el tiempo real
    const interval = setInterval(() => {
      if (user?.contador_fin && estadoLocal === "activo") {
        const now = moment();
        const end = moment(user.contador_fin);
        const diff = end.diff(now);

        if (diff <= 0) {
          setEstadoLocal("vencido");
          setTimeLeft("00:00:00");
        } else {
          const dur = moment.duration(diff);
          const hours = Math.floor(dur.asHours());
          const mins = dur.minutes().toString().padStart(2, '0');
          const secs = dur.seconds().toString().padStart(2, '0');
          setTimeLeft(`${hours > 0 ? hours + ':' : ''}${mins}:${secs}`);
          setEstadoLocal("activo"); // Forzamos activo si aún no llegó a cero
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, config, isActiveGlobal, pausarSinStock, stock, estadoLocal]);

  if (!isActiveGlobal || estadoLocal === "inactivo") return null;

  const getEstilos = () => {
    switch (estadoLocal) {
      case "pausado_sin_stock":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          msg: "Sin stock disponible por el momento",
          valor: null
        };
      case "vencido":
        return {
          bg: "bg-red-50 border-red-200 text-red-800",
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          msg: config.contador_mensaje_vencido || "La oferta terminó",
          valor: config.contador_valor_vencido
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
      <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] opacity-80">
        {estilo.icon}
        {estadoLocal === "activo" && timeLeft ? "Tiempo restante: " + timeLeft : estilo.msg}
      </div>

      {estadoLocal === "activo" && timeLeft && (
        <p className="text-3xl font-black font-mono tracking-tight">{timeLeft}</p>
      )}

      {estadoLocal === "activo" && estilo.valor && parseFloat(estilo.valor) > 0 && (
        <div className="mt-1 bg-white/60 px-3 py-1.5 rounded-lg inline-block">
          <p className="text-xs font-semibold opacity-80 uppercase">Valor Promocional</p>
          <p className="text-lg font-black">${parseFloat(estilo.valor).toLocaleString("es-AR")}</p>
        </div>
      )}

      {estadoLocal === "vencido" && (
        <div className="mt-1">
          <p className="text-base font-bold">{estilo.msg}</p>
          {estilo.valor && parseFloat(estilo.valor) > 0 && (
            <p className="text-sm mt-1 font-semibold opacity-90">Precio actual: ${parseFloat(estilo.valor).toLocaleString("es-AR")}</p>
          )}
        </div>
      )}
    </div>
  );
}