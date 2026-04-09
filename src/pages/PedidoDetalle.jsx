import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import EstadoBadge from "../components/EstadoBadge";
import moment from "moment";

export default function PedidoDetalle({ pedidoId, onBack }) {
  const [pedido, setPedido] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pedidoData, detallesData] = await Promise.all([
        base44.entities.Pedido.filter({ id: pedidoId }),
        base44.entities.DetallePedido.filter({ pedido_id: pedidoId }),
      ]);
      setPedido(pedidoData[0]);
      setDetalles(detallesData);
      setLoading(false);
    }
    load();
  }, [pedidoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!pedido) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Detalle del Pedido</h1>
            <p className="text-xs text-muted-foreground">
              {moment(pedido.fecha).format("DD/MM/YYYY HH:mm")}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Estado</span>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Tipo de Pago</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              pedido.tipo_pago === "contado"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {pedido.tipo_pago === "contado" ? "Contado" : "A Cuenta"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Multiplicador</span>
            <span className="text-sm font-medium">×{pedido.multiplicador_usado || 1}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Ítems</h3>
          <div className="space-y-2.5">
            {detalles.map((d) => (
              <div key={d.id} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{d.item_nombre}</span>
                  <span className="text-muted-foreground"> × {d.cantidad}</span>
                </div>
                <span className="font-semibold">{d.valor_calculado}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2.5 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{pedido.total}</span>
            </div>
          </div>
        </div>

        {pedido.observaciones && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-2">Observaciones</h3>
            <p className="text-sm text-muted-foreground">{pedido.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  );
}