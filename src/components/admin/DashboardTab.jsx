import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import moment from "moment";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

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

  // Ventas por mes (últimos 6 meses)
  const ventasPorMes = [];
  for (let i = 5; i >= 0; i--) {
    const mes = moment().subtract(i, "months");
    const label = mes.format("MMM YY");
    const total = pedidos
      .filter(p => p.estado === "entregado" && moment(p.fecha).isSame(mes, "month"))
      .reduce((s, p) => s + (p.total || 0), 0);
    const pagado = pagos
      .filter(p => moment(p.fecha).isSame(mes, "month"))
      .reduce((s, p) => s + (p.monto || 0), 0);
    ventasPorMes.push({ mes: label, Ventas: total, Pagos: pagado });
  }

  // Usuarios más activos (por total pedido)
  const usuariosActivos = users
    .filter(u => u.role !== "admin")
    .map(u => ({
      nombre: (u.full_name || u.email).split(" ")[0],
      total: pedidos
        .filter(p => p.usuario_email === u.email && p.estado === "entregado")
        .reduce((s, p) => s + (p.total || 0), 0),
    }))
    .filter(u => u.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Resumen financiero
  const totalVentas = pedidos
    .filter(p => p.estado === "entregado")
    .reduce((s, p) => s + (p.total || 0), 0);
  const totalCobrado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const deudaPendiente = totalVentas - totalCobrado;

  const pieData = [
    { name: "Cobrado", value: totalCobrado },
    { name: "Pendiente", value: Math.max(deudaPendiente, 0) },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total Ventas</p>
          <p className="text-xl font-bold text-foreground">${totalVentas.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Cobrado</p>
          <p className="text-xl font-bold text-green-600">${totalCobrado.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Deuda</p>
          <p className={`text-xl font-bold ${deudaPendiente > 0 ? "text-red-600" : "text-green-600"}`}>
            ${Math.max(deudaPendiente, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Ventas por mes */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Ventas vs Cobros por Mes</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ventasPorMes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pagos" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie + usuarios activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Ingresos vs Deuda</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? "#10b981" : "#ef4444"} />)}
              </Pie>
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Usuarios más Activos</h3>
          {usuariosActivos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={usuariosActivos} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {usuariosActivos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}