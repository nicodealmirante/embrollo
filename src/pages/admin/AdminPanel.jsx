import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, ClipboardList, Plus, Trash2, CheckCircle, Pencil, X, History, Edit, LayoutDashboard, UserCheck, MessageCircle, Settings, Shield, DollarSign } from "lucide-react";
import ChatAdmin from "../../components/admin/ChatAdmin";
import DashboardTab from "../../components/admin/DashboardTab";
import ConfigTab from "../../components/admin/ConfigTab";
import PagosPendientesTab from "../../components/admin/PagosPendientesTab";
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
  const { toast } = useToast();
  const { userName } = useRoleNames();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [usersData, pedidosData, pagosData] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Pedido.list(),
      base44.entities.Pago.list(),
    ]);
    setUsers(usersData);
    setPedidos(pedidosData);
    setPagos(pagosData);
  }

  const getSaldo = (email) => {
    const totalPedido = pedidos.filter(p => p.usuario_email === email && p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
    const totalPagado = pagos.filter(p => p.usuario_email === email).reduce((s, p) => s + (p.monto || 0), 0);
    return totalPedido - totalPagado;
  };

  const openEdit = (user) => {
    setEditDialog(user);
    setEditForm({ link_titulo: user.link_titulo || "", valor_contado: user.valor_contado || 0, valor_cuenta: user.valor_cuenta || 0, ajuste: "" });
  };

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.User.update(editDialog.id, {
      link_titulo: editForm.link_titulo,
      valor_contado: parseFloat(editForm.valor_contado) || 0,
      valor_cuenta: parseFloat(editForm.valor_cuenta) || 0,
    });
    if (editForm.ajuste && parseFloat(editForm.ajuste) !== 0) {
      await base44.entities.Pago.create({
        usuario_email: editDialog.email,
        usuario_nombre: editDialog.full_name,
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
      usuario_nombre: user.full_name,
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
      usuario_nombre: pagoDialog.full_name,
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



  return (
    <div className="space-y-4">

      {users.filter(u => u.role !== "admin").map((user) => {
        const saldo = getSaldo(user.email);

        return (
          <div key={user.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-semibold">{user.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-lg font-bold ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${saldo.toLocaleString()}
                </p>
                {saldo > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-0.5">
                    +10% = ${Math.round(saldo * 1.1).toLocaleString()}
                  </p>
                )}
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
              {user.estado !== "activo" && (
                <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => aprobarUsuario(user)}>
                  <UserCheck className="w-3 h-3" /> Aprobar {userName}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                onClick={async () => {
                  if (!confirm(`¿Convertir a ${user.full_name || user.email} en administrador?`)) return;
                  await base44.entities.User.update(user.id, { role: "admin" });
                  toast({ title: "Usuario promovido a admin" });
                  loadData();
                }}
              >
                <Shield className="w-3 h-3" /> Hacer admin
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-destructive hover:text-destructive ml-auto" onClick={async () => { if (!confirm(`¿Eliminar a ${user.full_name || user.email}? Esta acción no se puede deshacer.`)) return; await base44.entities.User.delete(user.id); toast({ title: "Usuario eliminado" }); loadData(); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Editar usuario dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar — {editDialog?.full_name || editDialog?.email}</DialogTitle></DialogHeader>
          {editDialog && (
            <div className="space-y-3 mt-2">
              <div><Label className="text-xs">Título del enlace</Label><Input value={editForm.link_titulo} onChange={e => setEditForm(f => ({ ...f, link_titulo: e.target.value }))} placeholder={editDialog.full_name || editDialog.email} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-green-700">Valor Contado</Label><Input type="number" value={editForm.valor_contado} onChange={e => setEditForm(f => ({ ...f, valor_contado: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs text-blue-700">Valor a Cuenta</Label><Input type="number" value={editForm.valor_cuenta} onChange={e => setEditForm(f => ({ ...f, valor_cuenta: e.target.value }))} className="mt-1" /></div>
              </div>
              <div>
                <Label className="text-xs text-red-600">Ajuste de saldo</Label>
                <p className="text-[10px] text-muted-foreground mb-1">Positivo para abonar, negativo para agregar deuda. Saldo actual: <strong>${getSaldo(editDialog.email).toLocaleString()}</strong></p>
                <Input type="number" value={editForm.ajuste} onChange={e => setEditForm(f => ({ ...f, ajuste: e.target.value }))} placeholder="Ej: 5000 o -2000" className="mt-1" />
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
              <p className="text-sm text-muted-foreground">{pagoDialog.full_name || pagoDialog.email}</p>
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
          <DialogHeader><DialogTitle>Historial — {historialUser?.full_name || historialUser?.email}</DialogTitle></DialogHeader>
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

    </div>
  );
}

// ─── Pedidos Tab ──────────────────────────────────────────────────────────────
function PedidosTab() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("pendiente");
  const [editingId, setEditingId] = useState(null);
  const [editCantidad, setEditCantidad] = useState("");
  const [entregaDialog, setEntregaDialog] = useState(null);
  const [tipoPagoEntrega, setTipoPagoEntrega] = useState("contado");
  const { toast } = useToast();

  useEffect(() => { loadPedidos(); }, []);

  async function loadPedidos() {
    const data = await base44.entities.Pedido.list("-created_date");
    setPedidos(data);
    setLoading(false);
  }

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

    // Si es contado: registrar pago automático para que saldo quede en 0
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
    loadPedidos();
  };

  const deletePedido = async (id) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    await base44.entities.Pedido.delete(id);
    toast({ title: "Pedido eliminado" });
    loadPedidos();
  };

  const saveEdit = async (pedido) => {
    const cant = parseFloat(editCantidad);
    if (!cant || cant <= 0) return;
    const newTotal = cant * (pedido.valor_usado || 0);
    await base44.entities.Pedido.update(pedido.id, { cantidad: cant, total: newTotal });
    setEditingId(null);
    toast({ title: "Actualizado" });
    loadPedidos();
  };

  const filtered = pedidos.filter(p => filtro === "todos" || p.estado === filtro);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm">{p.usuario_nombre || p.usuario_email}</p>
                <p className="text-xs text-muted-foreground">{moment(p.fecha).format("DD/MM/YY HH:mm")}</p>
              </div>
              <EstadoBadge estado={p.estado} />
            </div>

            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-muted-foreground">Cant:&nbsp;
                {editingId === p.id
                  ? <Input type="number" value={editCantidad} onChange={e => setEditCantidad(e.target.value)} className="inline-block w-20 h-6 text-sm" />
                  : <strong>{p.cantidad}</strong>}
              </span>
              {p.estado === "entregado" && (
                <>
                  <span className="text-muted-foreground">Tipo: <strong>{p.tipo_pago === "contado" ? "Contado" : "A Cuenta"}</strong></span>
                  <span className="text-muted-foreground">Total: <strong>${(p.total || 0).toLocaleString()}</strong></span>
                </>
              )}
              {p.observaciones && <span className="text-muted-foreground italic text-xs">{p.observaciones}</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              {p.estado === "pendiente" && (
                <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => { setEntregaDialog(p); setTipoPagoEntrega("contado"); }}>
                  <CheckCircle className="w-3 h-3" /> Confirmar entrega
                </Button>
              )}

              {editingId === p.id ? (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveEdit(p)}>Guardar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditingId(p.id); setEditCantidad(String(p.cantidad)); }}>
                  <Pencil className="w-3 h-3" /> Modificar
                </Button>
              )}

              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive gap-1 ml-auto"
                onClick={() => deletePedido(p.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin pedidos</p>}
      </div>

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
  const [tab, setTab] = useState("pedidos");
  const [mensajesNL, setMensajesNL] = useState(0);
  const [pagosNL, setPagosNL] = useState(0);
  const { adminName, userName } = useRoleNames();

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

    return () => { unsub(); unsubPagos(); clearTimeout(timeout); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Panel de {adminName}</h1>

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
            onClick={() => setTab("pedidos")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "pedidos" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <ClipboardList className="w-4 h-4" /> Pedidos
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
            onClick={() => setTab("pagos")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all relative ${tab === "pagos" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <DollarSign className="w-4 h-4" /> Pagos
            {pagosNL > 0 && (
              <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pagosNL}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("config")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "config" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <Settings className="w-4 h-4" /> Configuración
          </button>
        </div>

        {tab === "dashboard" && <DashboardTab />}
        {tab === "usuarios" && <UsuariosTab />}
        {tab === "pedidos" && <PedidosTab />}
        {tab === "chat" && <ChatAdmin />}
        {tab === "pagos" && <PagosPendientesTab />}
        {tab === "config" && <ConfigTab />}
      </div>
    </div>
  );
}