import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, ClipboardList, Plus, Trash2, CheckCircle, Pencil, X, History, Edit, LayoutDashboard, UserCheck, MessageCircle, Settings, Shield, DollarSign, Calculator, Search, Wallet, UserRound, PackagePlus, Filter, XCircle, ExternalLink } from "lucide-react";
import { listarUsuarios } from "@/functions/listarUsuarios";
import ChatAdmin from "../../components/admin/ChatAdmin";
import DashboardTab from "../../components/admin/DashboardTab";
import ConfigTab from "../../components/admin/ConfigTab";
import CalculoTab from "../../components/admin/CalculoTab";
import Portal from "../../pages/Portal";
import { useRoleNames } from "@/hooks/useRoleNames";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import EstadoBadge from "../../components/EstadoBadge";
import moment from "moment";
import { getNombreVisible } from "@/lib/utils";

function generateToken() {
  return Math.random().toString(36).substr(2, 10) + Math.random().toString(36).substr(2, 10);
}

function getPublicLink(token) {
  return `${window.location.origin}/p/${token}`;
}

// ─── Usuarios Tab ─────────────────────────────────────────────────────────────
function UsuariosTab() {
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [pagoDialog, setPagoDialog] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "efectivo", referencia: "", observaciones: "" });
  const [historialUser, setHistorialUser] = useState(null);
  const [editDialog, setEditDialog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [nuevoPedidoUser, setNuevoPedidoUser] = useState(null);
  const [npCantidad, setNpCantidad] = useState("1");
  const [npObs, setNpObs] = useState("");
  const [npSubmitting, setNpSubmitting] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [saldoFiltro, setSaldoFiltro] = useState("todos");
  const { toast } = useToast();
  const { userName } = useRoleNames();

  const getDisplayName = getNombreVisible;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [usersResp, pedidosData, pagosData] = await Promise.all([
      listarUsuarios({}),
      base44.entities.Pedido.list(),
      base44.entities.Pago.list(),
    ]);
    const usersData = usersResp.data?.users || [];
    setUsers(usersData);
    setPedidos(pedidosData);
    setPagos(pagosData);
  }

  const getSaldo = (email) => {
    const totalPedido = pedidos.filter(p => p.usuario_email === email && p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
    const totalPagado = pagos.filter(p => p.usuario_email === email).reduce((s, p) => s + (p.monto || 0), 0);
    return totalPedido - totalPagado;
  };

  const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString("es-AR")}`;

  const getCompraStats = (email) => {
    const entregados = pedidos.filter(p => p.usuario_email === email && p.estado === "entregado").sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const ultima = entregados[0] || null;
    const ahora = new Date();
    const hace7 = new Date(ahora - 7 * 24 * 60 * 60 * 1000);
    const hace30 = new Date(ahora - 30 * 24 * 60 * 60 * 1000);
    const total7 = entregados.filter(p => new Date(p.fecha) >= hace7).reduce((s, p) => s + (p.cantidad || 0), 0);
    const total30 = entregados.filter(p => new Date(p.fecha) >= hace30).reduce((s, p) => s + (p.cantidad || 0), 0);
    return { ultima, total7, total30 };
  };

  const openEdit = (user) => {
    setEditDialog(user);
    setEditForm({ nombre_visible: user.nombre_visible || user.link_titulo || user.full_name || "", valor_contado: user.valor_contado || 0, valor_cuenta: user.valor_cuenta || 0, ajuste: "", role: user.role || "user" });
  };

  const saveEdit = async () => {
    if (editForm.role === "admin" && editDialog.role !== "admin") {
      if (!confirm(`¿Convertir a ${getDisplayName(editDialog)} en administrador?`)) return;
    }
    setSaving(true);
    await base44.entities.User.update(editDialog.id, {
      nombre_visible: editForm.nombre_visible,
      valor_contado: parseFloat(editForm.valor_contado) || 0,
      valor_cuenta: parseFloat(editForm.valor_cuenta) || 0,
      role: editForm.role,
    });
    if (editForm.ajuste && parseFloat(editForm.ajuste) !== 0) {
      await base44.entities.Pago.create({
        usuario_email: editDialog.email,
        usuario_nombre: getDisplayName(editDialog),
        fecha: new Date().toISOString(),
        monto: parseFloat(editForm.ajuste),
        metodo: "otro",
        referencia: "Ajuste manual de saldo",
        observaciones: "",
      });
    }
    setSaving(false);
    toast({ title: "Guardado" });
    setEditDialog(null);
    loadData();
  };

  const aplicarAumento = async (user) => {
    const saldo = getSaldo(user.email);
    if (saldo <= 0) return;
    const aumento = Math.round(saldo * 0.1);
    await base44.entities.Pago.create({
      usuario_email: user.email,
      usuario_nombre: getDisplayName(user),
      fecha: new Date().toISOString(),
      monto: -aumento,
      metodo: "otro",
      referencia: "Aumento 10%",
      observaciones: "",
    });
    toast({ title: `+10% aplicado: $${aumento.toLocaleString()}` });
    loadData();
  };

  const aprobarUsuario = async (user) => {
    await base44.entities.User.update(user.id, { estado: "activo" });
    toast({ title: "Usuario aprobado" });
    loadData();
  };

  const savePago = async () => {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) {
      toast({ title: "Error", description: "Ingrese un monto válido", variant: "destructive" });
      return;
    }
    await base44.entities.Pago.create({
      usuario_email: pagoDialog.email,
      usuario_nombre: getDisplayName(pagoDialog),
      fecha: new Date().toISOString(),
      monto: parseFloat(pagoForm.monto),
      metodo: pagoForm.metodo,
      referencia: pagoForm.referencia,
      observaciones: pagoForm.observaciones,
    });
    toast({ title: "Pago registrado" });
    setPagoDialog(null);
    loadData();
  };

  const openNuevoPedido = (user) => {
    setNuevoPedidoUser(user);
    setNpCantidad("1");
    setNpObs("");
  };

  const cerrarNuevoPedido = () => {
    if (npSubmitting) return;
    setNuevoPedidoUser(null);
    setNpCantidad("1");
    setNpObs("");
  };


  const usuariosBase = useMemo(() => users, [users]);

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuariosBase
      .filter(user => {
        const saldo = getSaldo(user.email);
        const texto = `${user.nombre_visible || ""} ${user.link_titulo || ""} ${user.full_name || ""} ${user.email || ""} ${user.phone || ""} ${user.telefono || ""}`.toLowerCase();
        const estadoOk = estadoFiltro === "todos" || (estadoFiltro === "activo" ? user.estado === "activo" : user.estado !== "activo");
        const saldoOk = saldoFiltro === "todos" || (saldoFiltro === "deuda" ? saldo > 0 : saldo <= 0);
        return (!q || texto.includes(q)) && estadoOk && saldoOk;
      })
      .sort((a, b) => getSaldo(b.email) - getSaldo(a.email));
  }, [usuariosBase, busqueda, estadoFiltro, saldoFiltro, pedidos, pagos]);

  const resumenUsuarios = useMemo(() => {
    const usersNormales = usuariosBase.filter(u => u.role !== "admin");
    const totalSaldo = usersNormales.reduce((s, u) => s + getSaldo(u.email), 0);
    const conDeuda = usersNormales.filter(u => getSaldo(u.email) > 0).length;
    const pendientes = usersNormales.filter(u => u.estado !== "activo").length;
    const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente").length;
    return { totalSaldo, conDeuda, pendientes, pedidosPendientes };
  }, [usuariosBase, pedidos, pagos]);

  const crearPedidoParaUsuario = async () => {
    if (!nuevoPedidoUser || !npCantidad || parseFloat(npCantidad) <= 0) {
      toast({ title: "Error", description: "Ingrese una cantidad válida", variant: "destructive" });
      return;
    }

    setNpSubmitting(true);
    try {
      await base44.entities.Pedido.create({
        usuario_email: nuevoPedidoUser.email,
        usuario_nombre: getDisplayName(nuevoPedidoUser),
        fecha: new Date().toISOString(),
        estado: "pendiente",
        tipo_pago: "cuenta",
        cantidad: parseFloat(npCantidad),
        valor_usado: 0,
        total: 0,
        observaciones: npObs.trim(),
      });

      toast({ title: "Pedido creado", description: `Asignado a ${getDisplayName(nuevoPedidoUser)}` });
      setNuevoPedidoUser(null);
      setNpCantidad("1");
      setNpObs("");
      loadData();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear el pedido", variant: "destructive" });
    } finally {
      setNpSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gestión de {userName}s</p>
            <h2 className="text-xl font-bold">Usuarios, pedidos y saldos</h2>
            <p className="text-sm text-muted-foreground">Vista más clara para operar rápido sin jugar a buscar botones escondidos.</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <UserRound className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border bg-background p-3"><p className="text-[11px] text-muted-foreground">Saldo total</p><p className={`text-lg font-black ${resumenUsuarios.totalSaldo > 0 ? "text-red-600" : "text-green-600"}`}>{formatMoney(resumenUsuarios.totalSaldo)}</p></div>
          <div className="rounded-xl border bg-background p-3"><p className="text-[11px] text-muted-foreground">Con deuda</p><p className="text-lg font-black">{resumenUsuarios.conDeuda}</p></div>
          <div className="rounded-xl border bg-background p-3"><p className="text-[11px] text-muted-foreground">Pendientes</p><p className="text-lg font-black text-amber-600">{resumenUsuarios.pendientes}</p></div>
          <div className="rounded-xl border bg-background p-3"><p className="text-[11px] text-muted-foreground">Pedidos abiertos</p><p className="text-lg font-black text-primary">{resumenUsuarios.pedidosPendientes}</p></div>
        </div>
      </div>

      <div className="sticky top-2 z-10 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre, mail o teléfono..." className="h-10 rounded-xl pl-9" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="h-10 rounded-xl sm:w-36"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="activo">Activos</SelectItem><SelectItem value="pendiente">Pendientes</SelectItem></SelectContent>
            </Select>
            <Select value={saldoFiltro} onValueChange={setSaldoFiltro}>
              <SelectTrigger className="h-10 rounded-xl sm:w-36"><Wallet className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Saldo</SelectItem><SelectItem value="deuda">Con deuda</SelectItem><SelectItem value="aldia">Al día</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {usuariosFiltrados.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No hay usuarios con esos filtros</p>
          <p className="text-sm text-muted-foreground">Borrá la búsqueda o cambiá el filtro, porque claramente el filtro no adivina deseos.</p>
        </div>
      )}

      {usuariosFiltrados.map((user) => {
        const saldo = getSaldo(user.email);
        const { ultima, total7, total30 } = getCompraStats(user.email);

        return (
          <div key={user.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  {getDisplayName(user)}
                  {user.role === "admin" && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Admin</span>}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-lg font-bold ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatMoney(saldo)}
                </p>
                {saldo > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-0.5">
                    +10% = {formatMoney(saldo * 1.1)}
                  </p>
                )}
              </div>
              
            </div>

            {/* Estadísticas de compra */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Última compra</p>
                {ultima ? (
                  <>
                    <p className="text-xs font-bold text-foreground mt-0.5">{moment(ultima.fecha).fromNow()}</p>
                    <p className="text-[10px] text-muted-foreground">{ultima.cantidad} u · ${(ultima.total || 0).toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Sin compras</p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Últimos 7d</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{total7}</p>
                <p className="text-[10px] text-muted-foreground">unidades</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Últimos 30d</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{total30}</p>
                <p className="text-[10px] text-muted-foreground">unidades</p>
              </div>
            </div>

            {user.estado !== "activo" && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700 font-semibold">⏳ {userName} pendiente de aprobación</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openEdit(user)}>
                <Edit className="w-3 h-3" /> Editar
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openNuevoPedido(user)}>
                <PackagePlus className="w-3.5 h-3.5" /> Nuevo Pedido
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { setPagoDialog(user); setPagoForm({ monto: "", metodo: "efectivo", referencia: "", observaciones: "" }); }}>
                <Plus className="w-3 h-3" /> Registrar pago
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setHistorialUser(user)}>
                <History className="w-3 h-3" /> Ver historial
              </Button>
              {getSaldo(user.email) > 0 && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => aplicarAumento(user)}>
                  +10%
                </Button>
              )}
              {user.estado !== "activo" && user.role !== "admin" && (
                <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => aprobarUsuario(user)}>
                  <UserCheck className="w-3 h-3" /> Aprobar {userName}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-destructive hover:text-destructive ml-auto" onClick={async () => { if (!confirm(`¿Eliminar a ${getDisplayName(user)}? Esta acción no se puede deshacer.`)) return; await base44.entities.User.delete(user.id); toast({ title: "Usuario eliminado" }); loadData(); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Editar usuario dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar — {getDisplayName(editDialog)}</DialogTitle></DialogHeader>
          {editDialog && (
            <div className="space-y-3 mt-2">
              <div><Label className="text-xs">Nombre visible</Label><Input value={editForm.nombre_visible} onChange={e => setEditForm(f => ({ ...f, nombre_visible: e.target.value }))} placeholder={editDialog.email} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-green-700">Valor Contado</Label><Input type="number" value={editForm.valor_contado} onChange={e => setEditForm(f => ({ ...f, valor_contado: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs text-blue-700">Valor a Cuenta</Label><Input type="number" value={editForm.valor_cuenta} onChange={e => setEditForm(f => ({ ...f, valor_cuenta: e.target.value }))} className="mt-1" /></div>
              </div>
              <div>
                <Label className="text-xs text-red-600">Ajuste de saldo</Label>
                <p className="text-[10px] text-muted-foreground mb-1">Positivo para abonar, negativo para agregar deuda. Saldo actual: <strong>${getSaldo(editDialog.email).toLocaleString()}</strong></p>
                <Input type="number" value={editForm.ajuste} onChange={e => setEditForm(f => ({ ...f, ajuste: e.target.value }))} placeholder="Ej: 5000 o -2000" className="mt-1" />
              </div>
              <div className="pt-3 border-t border-border">
                <Label className="text-xs font-semibold flex items-center gap-1"><Shield className="w-3 h-3" /> Permisos</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveEdit} disabled={saving} className="w-full">{saving ? "Guardando..." : "Guardar cambios"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>



      <Dialog open={!!pagoDialog} onOpenChange={() => setPagoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          {pagoDialog && (
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">{getDisplayName(pagoDialog)}</p>
              <div><Label className="text-xs">Monto *</Label><Input type="number" value={pagoForm.monto} onChange={(e) => setPagoForm(f => ({ ...f, monto: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs">Método</Label>
                <Select value={pagoForm.metodo} onValueChange={(v) => setPagoForm(f => ({ ...f, metodo: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Referencia</Label><Input value={pagoForm.referencia} onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs">Observaciones</Label><Textarea value={pagoForm.observaciones} onChange={(e) => setPagoForm(f => ({ ...f, observaciones: e.target.value }))} className="mt-1" rows={2} /></div>
              <Button onClick={savePago} className="w-full">Registrar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Historial dialog */}
      <Dialog open={!!historialUser} onOpenChange={() => setHistorialUser(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historial — {getDisplayName(historialUser)}</DialogTitle></DialogHeader>
          {historialUser && (() => {
            const userPedidos = pedidos.filter(p => p.usuario_email === historialUser.email && p.estado === "entregado");
            const userPagos = pagos.filter(p => p.usuario_email === historialUser.email);
            const movimientos = [
              ...userPedidos.map(p => ({ ...p, _tipo: p.tipo_pago === "contado" ? "contado" : "cuenta", _fecha: p.fecha })),
              ...userPagos.map(p => ({ ...p, _tipo: "pago", _fecha: p.fecha })),
            ].sort((a, b) => new Date(b._fecha) - new Date(a._fecha));
            return (
              <div className="space-y-2 mt-2">
                {movimientos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos</p>}
                {movimientos.map((m, i) => {
                  const isPago = m._tipo === "pago";
                  const isContado = m._tipo === "contado";
                  const bg = isPago ? "bg-green-50 border-green-200" : isContado ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
                  const txt = isPago ? "text-green-700" : isContado ? "text-yellow-700" : "text-red-700";
                  const label = isPago ? "Pago" : isContado ? "Contado" : "A Cuenta";
                  const monto = isPago ? m.monto : m.total;
                  const signo = isPago ? "+" : "-";
                  return (
                    <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${bg}`}>
                      <div>
                        <p className={`text-xs font-semibold ${txt}`}>{label}</p>
                        <p className="text-xs text-muted-foreground">{moment(m._fecha).format("DD/MM/YY HH:mm")}</p>
                        {!isPago && <p className="text-xs text-muted-foreground">{m.cantidad} unidades</p>}
                        {isPago && m.referencia && <p className="text-xs text-muted-foreground">{m.referencia}</p>}
                      </div>
                      <p className={`font-bold text-sm ${txt}`}>{signo}${(monto || 0).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Nuevo pedido desde la ficha del usuario */}
      <Dialog open={!!nuevoPedidoUser} onOpenChange={cerrarNuevoPedido}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </DialogTitle>
          </DialogHeader>
          {nuevoPedidoUser && (
            <div className="space-y-3 mt-1">
              <div className="bg-muted/50 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">Usuario</p>
                <p className="text-sm font-semibold">{getDisplayName(nuevoPedidoUser)}</p>
                <p className="text-xs text-muted-foreground">{nuevoPedidoUser.email}</p>
              </div>
              <div>
                <Label className="text-xs">Cantidad *</Label>
                <Input
                  type="number"
                  value={npCantidad}
                  onChange={e => setNpCantidad(e.target.value)}
                  placeholder="0"
                  className="mt-1 text-xl font-bold text-center h-12"
                  min="1"
                />
              </div>
              <div>
                <Label className="text-xs">Observaciones</Label>
                <Input
                  value={npObs}
                  onChange={e => setNpObs(e.target.value)}
                  placeholder="Opcional"
                  className="mt-1"
                />
              </div>
              <Button onClick={crearPedidoParaUsuario} disabled={npSubmitting} className="w-full h-11">
                {npSubmitting ? "Creando..." : "Crear Pedido"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Solicitudes Tab ─────────────────────────────────────────────────────────
function SolicitudesTab() {
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entregaDialog, setEntregaDialog] = useState(null);
  const [tipoPagoEntrega, setTipoPagoEntrega] = useState("contado");
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [pedData, pagData] = await Promise.all([
      base44.entities.Pedido.filter({ estado: "pendiente" }, "-created_date"),
      base44.entities.Pago.filter({ origen: "usuario", estado: "pendiente" }, "-created_date")
    ]);
    setPedidos(pedData);
    setPagos(pagData);
    setLoading(false);
  }

  // --- Lógica Pedidos ---
  const confirmarEntrega = async () => {
    const p = entregaDialog;
    const users = await base44.entities.User.filter({ email: p.usuario_email });
    const user = users[0] || {};
    const valor = tipoPagoEntrega === 'contado' ? (user.valor_contado || 0) : (user.valor_cuenta || 0);
    const total = p.cantidad * valor;

    await base44.entities.Pedido.update(p.id, {
      estado: 'entregado',
      tipo_pago: tipoPagoEntrega,
      valor_usado: valor,
      total,
    });

    if (tipoPagoEntrega === 'contado') {
      await base44.entities.Pago.create({
        usuario_email: p.usuario_email,
        usuario_nombre: p.usuario_nombre,
        fecha: new Date().toISOString(),
        monto: total,
        metodo: 'efectivo',
        referencia: 'Pago contado automático',
        observaciones: `Pedido del ${new Date(p.fecha).toLocaleDateString()}`,
      });
    }
    toast({ title: tipoPagoEntrega === 'contado' ? 'Entrega confirmada y pago registrado' : 'Entrega confirmada — saldo pendiente' });
    setEntregaDialog(null);
    loadData();
  };

  const deletePedido = async (id) => {
    if (!confirm("¿Cancelar este pedido?")) return;
    await base44.entities.Pedido.update(id, { estado: "cancelado" });
    toast({ title: "Pedido cancelado" });
    loadData();
  };

  // --- Lógica Pagos ---
  async function aprobarPago(pago) {
    await base44.entities.Pago.update(pago.id, { estado: "aprobado" });
    toast({ title: "Pago aprobado ✓" });
    loadData();
  }

  async function rechazarPago(pago) {
    if (!confirm(`¿Rechazar el pago de $${pago.monto?.toLocaleString()} de ${pago.usuario_nombre}?`)) return;
    await base44.entities.Pago.update(pago.id, { estado: "rechazado" });
    toast({ title: "Pago rechazado" });
    loadData();
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const items = [
    ...pedidos.map(p => ({ ...p, _type: 'pedido', _date: new Date(p.fecha) })),
    ...pagos.map(p => ({ ...p, _type: 'pago', _date: new Date(p.fecha) }))
  ].sort((a, b) => b._date - a._date);

  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No hay solicitudes pendientes.</p>}
      
      {items.map((item, idx) => (
        <div key={idx} className={`bg-card rounded-2xl border border-border p-4 shadow-sm ${item._type === 'pago' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item._type === 'pago' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item._type}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">{moment(item.fecha).fromNow()}</span>
              </div>
              <p className="font-semibold text-sm">{item.usuario_nombre || item.usuario_email}</p>
              <p className="text-xs text-muted-foreground">{moment(item.fecha).format("DD/MM/YY HH:mm")}</p>
            </div>
            <div className="text-right">
              {item._type === 'pago' ? (
                <>
                  <p className="font-bold text-green-600">${(item.monto || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.metodo}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-blue-600">{item.cantidad} unidades</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.tipo_pago}</p>
                </>
              )}
            </div>
          </div>

          {item.observaciones && <p className="mt-2 text-xs text-muted-foreground italic bg-muted/50 p-2 rounded-lg">{item.observaciones}</p>}
          {item.referencia && <p className="mt-2 text-xs text-muted-foreground">Ref: <strong>{item.referencia}</strong></p>}
          {item.comprobante_url && (
            <a href={item.comprobante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline mt-2">
              <ExternalLink className="w-3 h-3" /> Ver comprobante
            </a>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {item._type === 'pedido' ? (
              <>
                <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => { setEntregaDialog(item); setTipoPagoEntrega("contado"); }}>
                  <CheckCircle className="w-3 h-3" /> Confirmar entrega
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive gap-1" onClick={() => deletePedido(item.id)}>
                  <Trash2 className="w-3 h-3" /> Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => aprobarPago(item)}>
                  <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => rechazarPago(item)}>
                  <XCircle className="w-3.5 h-3.5" /> Rechazar
                </Button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Entrega dialog */}
      <Dialog open={!!entregaDialog} onOpenChange={() => setEntregaDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Entrega</DialogTitle></DialogHeader>
          {entregaDialog && (
            <div className="space-y-4 mt-2">
              <p className="text-sm"><strong>{entregaDialog.usuario_nombre}</strong> · {entregaDialog.cantidad} unidades</p>
              <div>
                <Label className="text-xs">Tipo de pago</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setTipoPagoEntrega("contado")}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${tipoPagoEntrega === "contado" ? "border-green-500 bg-green-50 text-green-700" : "border-border text-muted-foreground"}`}
                  >
                    Contado
                  </button>
                  <button
                    onClick={() => setTipoPagoEntrega("cuenta")}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${tipoPagoEntrega === "cuenta" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    A Cuenta
                  </button>
                </div>
              </div>
              <Button onClick={confirmarEntrega} className="w-full">Confirmar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState("solicitudes");
  const [mensajesNL, setMensajesNL] = useState(0);
  const [pagosNL, setPagosNL] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUser, setPreviewUser] = useState("");
  const [usuariosActivos, setUsuariosActivos] = useState([]);
  const { adminName, userName } = useRoleNames();
  const navigate = useNavigate();

  useEffect(() => {
    let timeout = null;
    async function checkNoLeidos() {
      const msgs = await base44.entities.Mensaje.list();
      const nl = msgs.filter(m => !m.es_admin && !m.leido).length;
      setMensajesNL(nl);
    }
    checkNoLeidos();
    const unsub = base44.entities.Mensaje.subscribe(() => {
      clearTimeout(timeout);
      timeout = setTimeout(checkNoLeidos, 2000);
    });

    async function checkPagosPendientes() {
      const data = await base44.entities.Pago.filter({ origen: "usuario", estado: "pendiente" });
      setPagosNL(data.length);
    }
    checkPagosPendientes();
    const unsubPagos = base44.entities.Pago.subscribe(() => {
      setTimeout(checkPagosPendientes, 1000);
    });

    base44.entities.User.list().then(us => {
      setUsuariosActivos(us.filter(u => u.role !== "admin" && u.estado === "activo"));
    });

    return () => { unsub(); unsubPagos(); clearTimeout(timeout); };
  }, []);

  if (previewOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <Portal 
          adminPreviewMode={true} 
          previewEmail={previewUser || (usuariosActivos[0]?.email)} 
          onExitAdminPreview={() => setPreviewOpen(false)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Panel de {adminName}</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="h-8 gap-2 font-bold" onClick={() => navigate('/portal')}>
              <UserCheck className="w-3.5 h-3.5" /> Mi Portal
            </Button>
            <Select value={previewUser} onValueChange={setPreviewUser}>
              <SelectTrigger className="h-8 w-40 text-xs bg-card ml-2">
                <SelectValue placeholder="Usuario vista previa" />
              </SelectTrigger>
              <SelectContent>
                {usuariosActivos.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.nombre_visible || u.link_titulo || u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPreviewOpen(true)}>
              Ver modo usuario
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab("dashboard")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "dashboard" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setTab("usuarios")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "usuarios" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <Users className="w-4 h-4" /> {userName}s
          </button>
          <button
            onClick={() => setTab("solicitudes")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all relative ${tab === "solicitudes" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <ClipboardList className="w-4 h-4" /> Solicitudes
            {pagosNL > 0 && (
              <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pagosNL}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all relative ${tab === "chat" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <MessageCircle className="w-4 h-4" /> Chat
            {mensajesNL > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {mensajesNL}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("config")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "config" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <Settings className="w-4 h-4" /> Configuración
          </button>
          <button
            onClick={() => setTab("calculo")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "calculo" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <Calculator className="w-4 h-4" /> Cálculo
          </button>
        </div>

        {tab === "dashboard" && <DashboardTab />}
        {tab === "usuarios" && <UsuariosTab />}
        {tab === "solicitudes" && <SolicitudesTab />}
        {tab === "chat" && <ChatAdmin />}
        {tab === "config" && <ConfigTab />}
        {tab === "calculo" && <CalculoTab />}
      </div>
    </div>
  );
}