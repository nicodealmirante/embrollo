// minimal update: rename labels
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import moment from "moment";

export default function ContadorBanner({ user }) {
  const [timeLeft, setTimeLeft] = useState("00:00:00");

  useEffect(() => {
    if (!user?.contador_fin) return;
    const tick = () => {
      const diff = moment(user.contador_fin).diff(moment());
      if (diff <= 0) return setTimeLeft("00:00:00");
      const d = moment.duration(diff);
      const h = Math.floor(d.asHours()).toString().padStart(2, "0");
      const m = d.minutes().toString().padStart(2, "0");
      const s = d.seconds().toString().padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [user?.contador_fin]);

  const activo = user?.contador_fin && moment(user.contador_fin).isAfter(moment());
  const valorActivo = user?.valor_contador_activo ?? 7000;
  const valorFinal = user?.valor_contado || user?.valor_cuenta || 0;

  if (!activo) {
    return (
      <div className="p-4 rounded-2xl bg-red-50">
        <div className="text-sm">Valor final activo</div>
        <div className="text-2xl font-bold">${valorFinal}</div>
        <div className="text-xs">Hacé un pedido para recuperar el valor especial</div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white">
      <div className="text-xs">Valor de la unidad durante contador activo</div>
      <div className="text-4xl font-black">{timeLeft}</div>
      <div className="text-xl font-bold">${valorActivo}</div>
      <div className="text-xs">Cada unidad suma 1 hora</div>
    </div>
  );
}
