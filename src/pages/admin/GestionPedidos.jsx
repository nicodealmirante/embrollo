import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, CheckCircle, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EstadoBadge from "../../components/EstadoBadge";
import moment from "moment";
import { useToast } from "@/components/ui/use-toast";

export default function GestionPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [editingId, setEditingId] = useState(null);
  const [editCantidad, setEditCantidad] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPedidos();
  }, []);

  async function loadPedidos() {
    const data = await base44.entities.Pedido.list("-created_date");
    setPedidos(data);
    setLoading(false);
  }

  const changeEstado = async (pedidoId, nuevoEstado) => {
    await base44.entities.Pedido.update(pedidoId, { estado: nuevoEstado });
    toast({ title: "Estado actualizado" });
    loadPedidos();
  };

  const confirmEntrega = async (pedido) => {
    await base44.entities.Pedido.update(pedido.id, { estado: "entregado" });
    toast({ title: "Entrega confirmada" });
    loadPedidos();
  };

  const deletePedido = async (id) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    await base44.entities.Pedido.delete(id);
    toast({ title: "Pedido eliminado" });
    loadPedidos();
  };

  const startEdit = (pedido) => {
    setEditingId(pedido.id);
    setEditCantidad(String(pedido.cantidad));
  };

  const saveEdit = async (pedido) => {
    const cant = parseFloat(editCantidad);
    if (!cant || cant <= 0) return;
    const newTotal = cant * (pedido.valor_usado || 0);
    await base44.entities.Pedido.update(pedido.id, { cantidad: cant, total: newTotal });
    setEditingId(null);
    toast({ title: "Pedido actualizado" });
    loadPedidos();
  };

  const filtered = pedidos.filter((p) =>
    filtroEstado === "todos" || p.estado === filtroEstado
  );

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
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">{pedidos.length} en total</p>
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-sm">{p.usuario_nombre || p.usuario_email}</p>
                <p className="text-xs text-muted-foreground">{moment(p.fecha).format("DD/MM/YYYY HH:mm")}</p>
              </div>
              <div className="flex items-center gap-2">
                <EstadoBadge estado={p.estado} />
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  p.tipo_pago === "contado" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {p.tipo_pago === "contado" ? "Contado" : "A Cuenta"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-3 text-sm">
              <div>
                <span className="text-muted-foreground">Cantidad: </span>
                {editingId === p.id ? (
                  <Input
                    type="number"
                    value={editCantidad}
                    onChange={(e) => setEditCantidad(e.target.value)}
                    className="inline-block w-24 h-7 text-sm ml-1"
                  />
                ) : (
                  <span className="font-semibold">{p.cantidad}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Valor/u: </span>
                <span className="font-semibold">${(p.valor_usado || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-base">
                  ${(editingId === p.id
                    ? (parseFloat(editCantidad) || 0) * (p.valor_usado || 0)
                    : (p.total || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {p.observaciones && (
              <p className="text-xs text-muted-foreground mb-3 italic">{p.observaciones}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {p.estado !== "entregado" && p.estado !== "cancelado" && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => confirmEntrega(p)}
                >
                  <CheckCircle className="w-3 h-3" /> Confirmar entrega
                </Button>
              )}

              {editingId === p.id ? (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => saveEdit(p)}>
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditingId(null)}>
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => startEdit(p)}>
                  <Pencil className="w-3 h-3" /> Modificar cantidad
                </Button>
              )}

              <Select value={p.estado} onValueChange={(v) => changeEstado(p.id, v)}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive gap-1 ml-auto"
                onClick={() => deletePedido(p.id)}
              >
                <Trash2 className="w-3 h-3" /> Eliminar
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay pedidos
          </div>
        )}
      </div>
    </div>
  );
}