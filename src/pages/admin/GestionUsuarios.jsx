import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Copy, Check, Link, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

function generateToken() {
  return Math.random().toString(36).substr(2, 10) + Math.random().toString(36).substr(2, 10);
}

function getPublicLink(token) {
  return `${window.location.origin}/p/${token}`;
}

export default function GestionUsuarios() {
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [pagoDialog, setPagoDialog] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "efectivo", referencia: "", observaciones: "" });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [usersData, pedidosData, pagosData] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Pedido.list(),
      base44.entities.Pago.list(),
    ]);
    setUsers(usersData);
    setPedidos(pedidosData);
    setPagos(pagosData);

    // Init edit values
    const vals = {};
    usersData.forEach(u => {
      vals[u.id] = { valor_contado: u.valor_contado || 0, valor_cuenta: u.valor_cuenta || 0 };
    });
    setEditValues(vals);
    setLoading(false);
  }

  const getUserBalance = (email) => {
    const totalPedido = pedidos.filter(p => p.usuario_email === email && p.estado !== "cancelado")
      .reduce((s, p) => s + (p.total || 0), 0);
    const totalPagado = pagos.filter(p => p.usuario_email === email)
      .reduce((s, p) => s + (p.monto || 0), 0);
    return totalPedido - totalPagado;
  };

  const saveValues = async (user) => {
    setSavingId(user.id);
    const vals = editValues[user.id] || {};
    await base44.entities.User.update(user.id, {
      valor_contado: parseFloat(vals.valor_contado) || 0,
      valor_cuenta: parseFloat(vals.valor_cuenta) || 0,
    });
    setSavingId(null);
    toast({ title: "Guardado", description: "Valores actualizados" });
    loadData();
  };

  const generateLink = async (user) => {
    const token = generateToken();
    await base44.entities.User.update(user.id, { link_token: token });
    toast({ title: "Enlace generado", description: "El enlace fue creado exitosamente" });
    loadData();
  };

  const copyLink = (token, userId) => {
    navigator.clipboard.writeText(getPublicLink(token));
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openPagoDialog = (user) => {
    setPagoDialog(user);
    setPagoForm({ monto: "", metodo: "efectivo", referencia: "", observaciones: "" });
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
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuarios</p>
      </div>

      <div className="space-y-4">
        {users.map((user) => {
          const saldo = getUserBalance(user.email);
          const vals = editValues[user.id] || {};
          const hasLink = !!user.link_token;

          return (
            <div key={user.id} className="bg-card rounded-xl border border-border p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold">{user.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                    user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {user.role === "admin" ? "Admin" : "Usuario"}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-bold ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                    ${saldo.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs text-green-700">Valor Contado</Label>
                  <Input
                    type="number"
                    value={vals.valor_contado}
                    onChange={(e) => setEditValues(ev => ({ ...ev, [user.id]: { ...vals, valor_contado: e.target.value } }))}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-700">Valor a Cuenta</Label>
                  <Input
                    type="number"
                    value={vals.valor_cuenta}
                    onChange={(e) => setEditValues(ev => ({ ...ev, [user.id]: { ...vals, valor_cuenta: e.target.value } }))}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Link */}
              {hasLink && (
                <div className="mb-3 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground truncate flex-1">{getPublicLink(user.link_token)}</p>
                  <button onClick={() => copyLink(user.link_token, user.id)} className="shrink-0">
                    {copiedId === user.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => saveValues(user)}
                  disabled={savingId === user.id}
                >
                  <Save className="w-3 h-3" />
                  {savingId === user.id ? "Guardando..." : "Guardar valores"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  onClick={() => hasLink ? copyLink(user.link_token, user.id) : generateLink(user)}
                >
                  {hasLink ? (
                    copiedId === user.id ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar enlace</>
                  ) : (
                    <><Link className="w-3 h-3" /> Generar enlace</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  onClick={() => openPagoDialog(user)}
                >
                  <Plus className="w-3 h-3" />
                  Entrada manual
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment dialog */}
      <Dialog open={!!pagoDialog} onOpenChange={() => setPagoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Entrada Manual de Pago</DialogTitle>
          </DialogHeader>
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
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
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
              <Button onClick={savePago} className="w-full">Registrar Pago</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}