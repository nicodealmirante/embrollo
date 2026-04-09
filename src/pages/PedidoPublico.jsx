import { useState, useEffect } from "react";
import { getUserByToken } from "@/functions/getUserByToken";
import { crearPedidoPublico } from "@/functions/crearPedidoPublico";
import { Banknote, CreditCard, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from "react-router-dom";
import moment from "moment";

const estadoColors = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-blue-100 text-blue-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

const estadoLabels = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function PedidoPublico() {
  const { token } = useParams();
  const [userData, setUserData] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cantidad, setCantidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    const res = await getUserByToken({ token });
    if (res.data?.error || !res.data?.user) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setUserData(res.data.user);
    setPedidos(res.data.pedidos || []);
    setPagos(res.data.pagos || []);
    setLoading(false);
  }

  const totalPedido = pedidos.filter(p => p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
  const totalPagado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const saldo = totalPedido - totalPagado;

  const handlePedido = async (tipoPago) => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) {
      toast({ title: "Error", description: "Ingrese una cantidad válida", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await crearPedidoPublico({ token, cantidad: cant, tipoPago, observaciones });
    toast({ title: "Pedido enviado", description: "Tu pedido fue registrado exitosamente" });
    setCantidad("");
    setObservaciones("");
    setSubmitting(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Enlace no válido</h1>
          <p className="text-muted-foreground mt-2 text-sm">Este enlace no existe o fue desactivado.</p>
        </div>
      </div>
    );
  }

  const titulo = userData.link_titulo || userData.full_name || userData.email;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
          <p className="text-sm opacity-80">Bienvenido/a</p>
          <h1 className="text-2xl font-bold mt-0.5">{titulo}</h1>
          {userData.link_titulo && (
            <p className="text-sm opacity-70 mt-0.5">{userData.full_name}</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[10px] opacity-70">Pedido</p>
              <p className="text-sm font-bold">${totalPedido.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[10px] opacity-70">Pagado</p>
              <p className="text-sm font-bold">${totalPagado.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[10px] opacity-70">Saldo</p>
              <p className={`text-sm font-bold ${saldo > 0 ? "text-red-300" : "text-green-300"}`}>
                ${saldo.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Order form */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-sm">Generar Pedido</h2>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Cantidad</label>
            <Input
              type="number"
              placeholder="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 text-lg font-semibold h-12 text-center"
              min="1"
            />
          </div>

          {cantidad && parseFloat(cantidad) > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="text-muted-foreground">Contado</p>
                <p className="font-bold text-green-700 text-sm">
                  ${(parseFloat(cantidad) * (userData.valor_contado || 0)).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-muted-foreground">A Cuenta</p>
                <p className="font-bold text-blue-700 text-sm">
                  ${(parseFloat(cantidad) * (userData.valor_cuenta || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground font-medium">Observaciones (opcional)</label>
            <Textarea
              placeholder="Notas del pedido..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="mt-1 text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handlePedido("contado")}
              disabled={submitting}
              className="h-12 gap-2 bg-green-600 hover:bg-green-700 text-white flex-col"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              <span className="text-xs font-bold leading-tight">
                Contado
                <br /><span className="text-[10px] opacity-80">${(userData.valor_contado || 0).toLocaleString()}/u</span>
              </span>
            </Button>
            <Button
              onClick={() => handlePedido("cuenta")}
              disabled={submitting}
              className="h-12 gap-2 flex-col"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              <span className="text-xs font-bold leading-tight">
                A Cuenta
                <br /><span className="text-[10px] opacity-80">${(userData.valor_cuenta || 0).toLocaleString()}/u</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Last 5 movements */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Últimos movimientos</h2>
          </div>
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos aún</p>
          ) : (
            <div className="space-y-2">
              {pedidos.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs text-muted-foreground">{moment(p.fecha).format("DD/MM/YY")}</p>
                    <p className="font-medium">
                      {p.cantidad} u · {p.tipo_pago === "contado" ? "Contado" : "A Cuenta"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(p.total || 0).toLocaleString()}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${estadoColors[p.estado] || ""}`}>
                      {estadoLabels[p.estado]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}