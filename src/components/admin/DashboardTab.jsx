import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import moment from "moment";
import { getNombreVisible } from "@/lib/utils";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardTab() {
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [users, setUsers] = useState([]);
  const [ventasExternas, setVentasExternas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Pedido.list(),
      base44.entities.Pago.list(),
      base44.entities.User.list(),
      base44.entities.VentaExterna.list(),
    ]).then(([p, pa, u, ve]) => {
      setPedidos(p);
      setPagos(pa);
      setUsers(u);
      setVentasExternas(ve);
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
    
    // Externas
    const totalExt = ventasExternas
      .filter(v => moment(v.fecha).isSame(mes, "month"))
      .reduce((s, v) => s + (v.total || 0), 0);
    const pagadoExt = ventasExternas
      .filter(v => moment(v.fecha).isSame(mes, "month"))
      .reduce((s, v) => s + (v.monto_pagado || 0), 0);

    ventasPorMes.push({ 
      mes: label, 
      Ventas: total, 
      Pagos: pagado,
      "Ventas Ext": totalExt,
      "Pagos Ext": pagadoExt,
    });
  }

  // Usuarios más activos (por total pedido)
  const usuariosActivos = users
    .filter(u => u.role !== "admin")
    .map(u => ({
      nombre: getNombreVisible(u).split(" ")[0],
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

  // Externas
  const totalVentasExt = ventasExternas.reduce((s, v) => s + (v.total || 0), 0);
  const totalCobradoExt = ventasExternas.reduce((s, v) => s + (v.monto_pagado || 0), 0);
  const deudaExtPendiente = ventasExternas.reduce((s, v) => s + (v.saldo_pendiente || 0), 0);
  const totalProductosExt = ventasExternas.reduce((s, v) => s + (v.cantidad || 0), 0);

  const pieData = [
    { name: "Cobrado", value: totalCobrado },
    { name: "Pendiente", value: Math.max(deudaPendiente, 0) },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs Principales */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Resumen de Sistema</h3>
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
      </div>

      {/* KPIs Externos */}
      {ventasExternas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-amber-600">Resumen de Ventas Externas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-amber-700 uppercase tracking-wide mb-1">Prod. Vendidos</p>
              <p className="text-xl font-bold text-amber-700">{totalProductosExt.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-amber-700 uppercase tracking-wide mb-1">Total Externo</p>
              <p className="text-xl font-bold text-amber-700">${totalVentasExt.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-green-700 uppercase tracking-wide mb-1">Cobrado Ext</p>
              <p className="text-xl font-bold text-green-700">${totalCobradoExt.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-red-700 uppercase tracking-wide mb-1">Deuda Ext</p>
              <p className="text-xl font-bold text-red-700">${deudaExtPendiente.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

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
            {ventasExternas.length > 0 && <Bar dataKey="Ventas Ext" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
            {ventasExternas.length > 0 && <Bar dataKey="Pagos Ext" fill="#8b5cf6" radius={[4, 4, 0, 0]} />}
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