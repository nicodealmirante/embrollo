import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import moment from "moment";

const COSTO_UNIDAD = 5320;

function KPICard({ label, value, sub, color = "text-foreground" }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function DashboardTab() {
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Pedido.list(),
      base44.entities.Pago.list(),
      base44.entities.User.list(),
    ]).then(([p, pa, u]) => {
      setPedidos(p);
      setPagos(pa);
      setUsers(u);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const entregados = pedidos.filter(p => p.estado === "entregado");
  const pendientes = pedidos.filter(p => p.estado === "pendiente");

  // Totales globales
  const totalUnidades = entregados.reduce((s, p) => s + (p.cantidad || 0), 0);
  const totalVentas = entregados.reduce((s, p) => s + (p.total || 0), 0);
  const totalGanancia = totalVentas - (totalUnidades * COSTO_UNIDAD);
  const totalCobrado = pagos.filter(p => p.referencia !== "Pago contado automático" || true).reduce((s, p) => s + (p.monto || 0), 0);
  const deudaTotal = totalVentas - totalCobrado;
  const pedidosPendientesCount = pendientes.length;
  const clientesActivos = users.filter(u => u.role !== "admin" && u.estado === "activo").length;

  // Por mes (últimos 6)
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const mes = moment().subtract(i, "months");
    const label = mes.format("MMM");
    const ped = entregados.filter(p => moment(p.fecha).isSame(mes, "month"));
    const unidades = ped.reduce((s, p) => s + (p.cantidad || 0), 0);
    const ventas = ped.reduce((s, p) => s + (p.total || 0), 0);
    const ganancia = ventas - (unidades * COSTO_UNIDAD);

    const cobrado = pagos.filter(p => moment(p.fecha).isSame(mes, "month")).reduce((s, p) => s + (p.monto || 0), 0);
    meses.push({ mes: label, Pedidos: ped.length, Ganancia: Math.round(ganancia), Cobrado: Math.round(cobrado) });
  }

  // Deuda por usuario (top 5)
  const deudaPorUser = users
    .filter(u => u.role !== "admin")
    .map(u => {
      const venta = entregados.filter(p => p.usuario_email === u.email).reduce((s, p) => s + (p.total || 0), 0);
      const pago = pagos.filter(p => p.usuario_email === u.email).reduce((s, p) => s + (p.monto || 0), 0);
      return { nombre: u.full_name || u.email, deuda: venta - pago };
    })
    .filter(u => u.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda)
    .slice(0, 5);

  const pieData = [
    { name: "Cobrado", value: Math.max(totalCobrado, 0) },
    { name: "Deuda", value: Math.max(deudaTotal, 0) },
  ];

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Ganancia neta"
          value={`$${Math.round(totalGanancia).toLocaleString()}`}
          sub={`${totalUnidades} unidades · costo $${COSTO_UNIDAD.toLocaleString()}/u`}
          color="text-green-600"
        />
        <KPICard
          label="Total facturado"
          value={`$${totalVentas.toLocaleString()}`}
          sub={`${totalUnidades} unidades entregadas`}
        />
        <KPICard
          label="Deuda pendiente"
          value={`$${Math.max(deudaTotal, 0).toLocaleString()}`}
          sub={`${deudaPorUser.length} clientes con saldo`}
          color={deudaTotal > 0 ? "text-red-600" : "text-green-600"}
        />
        <KPICard
          label="Pedidos pendientes"
          value={pedidosPendientesCount}
          sub={`${clientesActivos} clientes activos`}
          color={pedidosPendientesCount > 0 ? "text-amber-600" : "text-green-600"}
        />
      </div>

      {/* Ganancias por mes */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-1">Ganancia mensual</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Últimos 6 meses · costo $5.320/u · precio según cliente</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={meses} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => `$${v.toLocaleString()}`} />
            <Bar dataKey="Ganancia" fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="Cobrado" fill="#3b82f6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pedidos por mes */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-4">Cantidad de pedidos entregados</h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={meses} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="Pedidos" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Deuda por cliente + Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-1">Estado de cobros</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Cobrado vs deuda total</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip formatter={v => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Top deudores</h3>
          {deudaPorUser.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin deudas pendientes 🎉</p>
          ) : (
            <div className="space-y-2">
              {deudaPorUser.map((u, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{i+1}.</span>
                    <span className="text-sm font-medium truncate">{u.nombre}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600 shrink-0">${u.deuda.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}