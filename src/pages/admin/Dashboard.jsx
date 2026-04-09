import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, CreditCard, Users, TrendingUp } from "lucide-react";
import StatCard from "../../components/StatCard";
import moment from "moment";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pedidos, pagos, users] = await Promise.all([
        base44.entities.Pedido.list("-created_date"),
        base44.entities.Pago.list("-created_date"),
        base44.entities.User.list(),
      ]);

      const today = moment().startOf("day");
      const pedidosHoy = pedidos.filter((p) =>
        moment(p.fecha).isSame(today, "day")
      );
      const totalPedido = pedidos
        .filter((p) => p.estado !== "cancelado")
        .reduce((sum, p) => sum + (p.total || 0), 0);
      const totalPagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);

      setStats({
        pedidosHoy: pedidosHoy.length,
        totalPedidos: pedidos.length,
        totalPedido,
        totalPagado,
        saldoPendiente: totalPedido - totalPagado,
        totalUsuarios: users.length,
        pedidosRecientes: pedidos.slice(0, 5),
        pagosRecientes: pagos.slice(0, 5),
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 pt-2 lg:pt-0">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del negocio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={ClipboardList}
          label="Pedidos hoy"
          value={stats.pedidosHoy}
          sublabel={`${stats.totalPedidos} en total`}
        />
        <StatCard
          icon={TrendingUp}
          label="Total pedido"
          value={`$${stats.totalPedido.toLocaleString()}`}
        />
        <StatCard
          icon={CreditCard}
          label="Total pagado"
          value={`$${stats.totalPagado.toLocaleString()}`}
        />
        <StatCard
          icon={Users}
          label="Saldo pendiente"
          value={`$${stats.saldoPendiente.toLocaleString()}`}
          sublabel={`${stats.totalUsuarios} usuarios`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-3">Pedidos Recientes</h2>
          {stats.pedidosRecientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin pedidos</p>
          ) : (
            <div className="space-y-2.5">
              {stats.pedidosRecientes.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.usuario_nombre || p.usuario_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {moment(p.fecha).format("DD/MM HH:mm")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(p.total || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.estado}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-3">Pagos Recientes</h2>
          {stats.pagosRecientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin pagos</p>
          ) : (
            <div className="space-y-2.5">
              {stats.pagosRecientes.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.usuario_nombre || p.usuario_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {moment(p.fecha).format("DD/MM HH:mm")}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">
                    +${(p.monto || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}