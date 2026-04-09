import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, ChevronRight } from "lucide-react";
import EstadoBadge from "../components/EstadoBadge";
import moment from "moment";
import PedidoDetalle from "./PedidoDetalle";

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const data = await base44.entities.Pedido.filter(
        { usuario_email: user.email },
        "-created_date"
      );
      setPedidos(data);
      setLoading(false);
    }
    load();
  }, []);

  if (selectedId) {
    return <PedidoDetalle pedidoId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Mis Pedidos</h1>
        <p className="text-xs text-muted-foreground">{pedidos.length} pedidos</p>
      </div>

      <div className="p-4 space-y-3">
        {pedidos.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Sin pedidos aún</p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <button
              key={pedido.id}
              onClick={() => setSelectedId(pedido.id)}
              className="w-full bg-card rounded-xl border border-border p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {moment(pedido.fecha).format("DD/MM/YYYY HH:mm")}
                  </p>
                  <p className="font-semibold mt-0.5">
                    Total: {pedido.total}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <EstadoBadge estado={pedido.estado} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              {pedido.observaciones && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {pedido.observaciones}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}