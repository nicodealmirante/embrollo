import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import BalanceTable from "../../components/BalanceTable";

const metodoLabels = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export default function GestionPagos() {
  const [pagos, setPagos] = useState([]);
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("pagos");
  const [form, setForm] = useState({
    usuario_email: "",
    fecha: new Date().toISOString().slice(0, 16),
    monto: "",
    metodo: "efectivo",
    referencia: "",
    observaciones: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [pagosData, usersData, pedidosData] = await Promise.all([
      base44.entities.Pago.list("-created_date"),
      base44.entities.User.list(),
      base44.entities.Pedido.list(),
    ]);
    setPagos(pagosData);
    setUsers(usersData);
    setPedidos(pedidosData);
    setLoading(false);
  }

  const openNew = () => {
    setForm({
      usuario_email: "",
      fecha: new Date().toISOString().slice(0, 16),
      monto: "",
      metodo: "efectivo",
      referencia: "",
      observaciones: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.usuario_email || !form.monto) {
      toast({ title: "Error", description: "Usuario y monto son obligatorios", variant: "destructive" });
      return;
    }
    const selectedUser = users.find((u) => u.email === form.usuario_email);
    await base44.entities.Pago.create({
      ...form,
      monto: parseFloat(form.monto),
      fecha: new Date(form.fecha).toISOString(),
      usuario_nombre: selectedUser?.full_name || form.usuario_email,
    });
    toast({ title: "Pago registrado", description: "El pago se ha registrado correctamente" });
    setDialogOpen(false);
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
      <div className="flex items-center justify-between mb-6 pt-2 lg:pt-0">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Pagos</h1>
          <p className="text-sm text-muted-foreground">{pagos.length} pagos registrados</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nuevo Pago
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("pagos")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            tab === "pagos" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Pagos
        </button>
        <button
          onClick={() => setTab("balance")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            tab === "balance" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Balance por Usuario
        </button>
      </div>

      {tab === "pagos" ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-left p-3 font-semibold">Usuario</th>
                  <th className="text-left p-3 font-semibold">Método</th>
                  <th className="text-right p-3 font-semibold">Monto</th>
                  <th className="text-left p-3 font-semibold">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-muted-foreground">
                      {moment(p.fecha).format("DD/MM/YY")}
                    </td>
                    <td className="p-3 font-medium">
                      {p.usuario_nombre || p.usuario_email}
                    </td>
                    <td className="p-3">{metodoLabels[p.metodo] || p.metodo}</td>
                    <td className="p-3 text-right font-semibold text-green-600">
                      +${(p.monto || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-muted-foreground">{p.referencia || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">Sin pagos registrados</div>
          )}
        </div>
      ) : (
        <BalanceTable users={users} pedidos={pedidos} pagos={pagos} />
      )}

      {/* New Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Usuario *</Label>
              <Select value={form.usuario_email} onValueChange={(v) => setForm((f) => ({ ...f, usuario_email: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto *</Label>
                <Input type="number" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input type="datetime-local" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Método de Pago</Label>
              <Select value={form.metodo} onValueChange={(v) => setForm((f) => ({ ...f, metodo: v }))}>
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
              <Input value={form.referencia} onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full">
              Registrar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}