import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Eye, ChevronDown } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function GestionPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [selectedPedido, setSelectedPedido] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPedidos();
  }, []);

  async function loadPedidos() {
    const data = await base44.entities.Pedido.list("-created_date");
    setPedidos(data);
    setLoading(false);
  }

  const openDetails = async (pedido) => {
    const det = await base44.entities.DetallePedido.filter({ pedido_id: pedido.id });
    setDetalles(det);
    setSelectedPedido(pedido);
  };

  const changeEstado = async (pedidoId, nuevoEstado) => {
    await base44.entities.Pedido.update(pedidoId, { estado: nuevoEstado });
    toast({ title: "Estado actualizado", description: `Pedido marcado como ${nuevoEstado}` });
    if (selectedPedido?.id === pedidoId) {
      setSelectedPedido((p) => ({ ...p, estado: nuevoEstado }));
    }
    loadPedidos();
  };

  const filtered = pedidos.filter((p) => {
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    if (filtroUsuario && !(p.usuario_nombre || p.usuario_email || "").toLowerCase().includes(filtroUsuario.toLowerCase())) return false;
    return true;
  });

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
        <h1 className="text-2xl font-bold">Gestión de Pedidos</h1>
        <p className="text-sm text-muted-foreground">{pedidos.length} pedidos en total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar usuario..."
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="w-48 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Usuario</th>
                <th className="text-left p-3 font-semibold">Estado</th>
                <th className="text-right p-3 font-semibold">Total</th>
                <th className="text-right p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">
                    {moment(p.fecha).format("DD/MM/YY HH:mm")}
                  </td>
                  <td className="p-3 font-medium">
                    {p.usuario_nombre || p.usuario_email}
                  </td>
                  <td className="p-3">
                    <Select
                      value={p.estado}
                      onValueChange={(v) => changeEstado(p.id, v)}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ${(p.total || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => openDetails(p)}
                    >
                      <Eye className="w-3 h-3" /> Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No se encontraron pedidos
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPedido} onOpenChange={() => setSelectedPedido(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Pedido</DialogTitle>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Usuario</p>
                  <p className="font-medium">{selectedPedido.usuario_nombre || selectedPedido.usuario_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha</p>
                  <p className="font-medium">{moment(selectedPedido.fecha).format("DD/MM/YYYY HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <EstadoBadge estado={selectedPedido.estado} />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Multiplicador</p>
                  <p className="font-medium">×{selectedPedido.multiplicador_usado || 1}</p>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="text-sm font-semibold mb-2">Ítems</h4>
                <div className="space-y-2">
                  {detalles.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm">
                      <span>
                        {d.item_nombre} × {d.cantidad}
                      </span>
                      <span className="font-semibold">{d.valor_calculado}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>${(selectedPedido.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedPedido.observaciones && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Observaciones</p>
                  <p className="text-sm mt-1">{selectedPedido.observaciones}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}