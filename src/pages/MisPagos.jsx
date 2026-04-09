import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import moment from "moment";

const metodoLabels = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export default function MisPagos() {
  const [pagos, setPagos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const [pagosData, pedidosData] = await Promise.all([
        base44.entities.Pago.filter({ usuario_email: user.email }, "-fecha"),
        base44.entities.Pedido.filter({ usuario_email: user.email }),
      ]);
      setPagos(pagosData);
      setPedidos(pedidosData);
      setLoading(false);
    }
    load();
  }, []);

  const totalPedido = pedidos
    .filter((p) => p.estado !== "cancelado")
    .reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const saldo = totalPedido - totalPagado;

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
        <h1 className="text-lg font-bold">Mis Pagos</h1>
        <p className="text-xs text-muted-foreground">Balance y movimientos</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <p className="text-[10px] text-muted-foreground">Pedido</p>
            <p className="text-sm font-bold">{totalPedido.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <CreditCard className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <p className="text-[10px] text-muted-foreground">Pagado</p>
            <p className="text-sm font-bold text-green-600">{totalPagado.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] text-muted-foreground">Saldo</p>
            <p className={`text-sm font-bold ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
              {saldo.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payments list */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Historial de Pagos</h2>
          {pagos.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagos.map((pago) => (
                <div
                  key={pago.id}
                  className="bg-card rounded-xl border border-border p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {moment(pago.fecha).format("DD/MM/YYYY")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {metodoLabels[pago.metodo] || pago.metodo}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">
                      +{pago.monto.toLocaleString()}
                    </p>
                  </div>
                  {pago.referencia && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Ref: {pago.referencia}
                    </p>
                  )}
                  {pago.observaciones && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {pago.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}