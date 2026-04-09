import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, ClipboardList, Copy, Check, Link, Save, Plus, Trash2, CheckCircle, Pencil, X } from "lucide-react";
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
  const [editValues, setEditValues] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [pagoDialog, setPagoDialog] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "efectivo", referencia: "", observaciones: "" });
  const { toast } = useToast();

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
    const vals = {};
    usersData.forEach(u => {
      vals[u.id] = { valor_contado: u.valor_contado || 0, valor_cuenta: u.valor_cuenta || 0, link_titulo: u.link_titulo || "" };
    });
    setEditValues(vals);
  }

  const getSaldo = (email) => {
    const totalPedido = pedidos.filter(p => p.usuario_email === email && p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
    const totalPagado = pagos.filter(p => p.usuario_email === email).reduce((s, p) => s + (p.monto || 0), 0);
    return totalPedido - totalPagado;
  };

  const saveUser = async (user) => {
    setSavingId(user.id);
    const vals = editValues[user.id] || {};
    await base44.entities.User.update(user.id, {
      valor_contado: parseFloat(vals.valor_contado) || 0,
      valor_cuenta: parseFloat(vals.valor_cuenta) || 0,
      link_titulo: vals.link_titulo || "",
    });
    setSavingId(null);
    toast({ title: "Guardado" });
    loadData();
  };

  const generateLink = async (user) => {
    const token = generateToken();
    await base44.entities.User.update(user.id, { link_token: token });
    toast({ title: "Enlace generado" });
    loadData();
  };

  const copyLink = (token, userId) => {
    navigator.clipboard.writeText(getPublicLink(token));
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
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
        const vals = editValues[user.id] || {};
        const hasLink = !!user.link_token;

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
              </div>
            </div>

            <div className="mb-3">
              <Label className="text-xs text-muted-foreground">Título del enlace</Label>
              <Input
                value={vals.link_titulo || ""}
                placeholder={user.full_name || user.email}
                onChange={(e) => setEditValues(ev => ({ ...ev, [user.id]: { ...vals, link_titulo: e.target.value } }))}
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs text-green-700">Valor Contado</Label>
                <Input
                  type="number"
                  value={vals.valor_contado}
                  onChange={(e) => setEditValues(ev => ({ ...ev, [user.id]: { ...vals, valor_contado: e.target.value } }))}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-blue-700">Valor a Cuenta</Label>
                <Input
                  type="number"
                  value={vals.valor_cuenta}
                  onChange={(e) => setEditValues(ev => ({ ...ev, [user.id]: { ...vals, valor_cuenta: e.target.value } }))}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>

            {hasLink && (
              <div className="mb-3 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground truncate flex-1">{getPublicLink(user.link_token)}</p>
                <button onClick={() => copyLink(user.link_token, user.id)}>
                  {copiedId === user.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => saveUser(user)} disabled={savingId === user.id}>
                <Save className="w-3 h-3" /> {savingId === user.id ? "Guardando..." : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                onClick={() => hasLink ? copyLink(user.link_token, user.id) : generateLink(user)}>
                {hasLink
                  ? (copiedId === user.id ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar enlace</>)
                  : <><Link className="w-3 h-3" /> Generar enlace</>}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { setPagoDialog(user); setPagoForm({ monto: "", metodo: "efectivo", referencia: "", observaciones: "" }); }}>
                <Plus className="w-3 h-3" /> Registrar pago
              </Button>
            </div>
          </div>
        );
      })}

      <Dialog open={!!pagoDialog} onOpenChange={() => setPagoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          {pagoDialog && (
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">{pagoDialog.full_name || pagoDialog.email}</p>
              <div>
                <Label className="text-xs">Monto *</Label>
                <Input type="number" value={pagoForm.monto} onChange={(e) => setPagoForm(f => ({ ...f, monto: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Método</Label>
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
              <div>
                <Label className="text-xs">Referencia</Label>
                <Input value={pagoForm.referencia} onChange={(e) => setPagoForm(f => ({ ...f, referencia: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Observaciones</Label>
                <Textarea value={pagoForm.observaciones} onChange={(e) => setPagoForm(f => ({ ...f, observaciones: e.target.value }))} className="mt-1" rows={2} />
              </div>
              <Button onClick={savePago} className="w-full">Registrar</Button>
            </div>
          )}
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>

        <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab("usuarios")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "usuarios" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <Users className="w-4 h-4" /> Usuarios
          </button>
          <button
            onClick={() => setTab("pedidos")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === "pedidos" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <ClipboardList className="w-4 h-4" /> Pedidos
          </button>
        </div>

        {tab === "usuarios" ? <UsuariosTab /> : <PedidosTab />}
      </div>
    </div>
  );
}