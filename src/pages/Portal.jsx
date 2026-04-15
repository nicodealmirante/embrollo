import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRoleNames } from "@/hooks/useRoleNames";
import { crearPedidoPublico } from "@/functions/crearPedidoPublico";
import { ClipboardList, Loader2, Send, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import ChatUsuario from "../components/ChatUsuario";
import NotificacionesConfig from "../components/NotificacionesConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function Portal() {
  const [user, setUser] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatNoLeidos, setChatNoLeidos] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { adminName } = useRoleNames();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (me.role === "admin") {
        navigate("/admin");
        return;
      }
      setUser(me);
      if (me.estado === "activo") {
        const [ped, pag] = await Promise.all([
          base44.entities.Pedido.filter({ usuario_email: me.email }, "-created_date"),
          base44.entities.Pago.filter({ usuario_email: me.email }),
        ]);
        setPedidos(ped);
        setPagos(pag);
      }
    } catch {
      base44.auth.redirectToLogin();
    }
    setLoading(false);
  }

  const totalPedido = pedidos.filter(p => p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
  const totalPagado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const saldo = totalPedido - totalPagado;

  const handlePedido = async () => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) {
      toast({ title: "Error", description: "Ingrese una cantidad válida", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await crearPedidoPublico({ useEmail: true, cantidad: cant, observaciones });
    toast({ title: "Pedido enviado", description: "Tu pedido fue registrado" });
    setSubmitting(false);
    setCantidad("");
    setObservaciones("");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (user.estado !== "activo") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h1 className="text-xl font-bold">Acceso pendiente</h1>
          <p className="text-sm text-muted-foreground">Tu cuenta está siendo revisada por el {adminName.toLowerCase()}. Pronto tendrás acceso a tu portal.</p>
          <p className="text-xs text-muted-foreground">Conectado como: <strong>{user.email}</strong></p>
          <Button variant="outline" size="sm" onClick={() => base44.auth.logout()}>Salir</Button>
        </div>
      </div>
    );
  }

  const titulo = user.link_titulo || user.full_name || user.email;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm opacity-80">Bienvenido/a</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChatOpen(true)}
                className="relative text-primary-foreground opacity-80 hover:opacity-100 transition-opacity"
              >
                <MessageCircle className="w-5 h-5" />
                {chatNoLeidos > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                    {chatNoLeidos}
                  </span>
                )}
              </button>
              <button onClick={() => base44.auth.logout()} className="text-xs opacity-60 hover:opacity-100 underline">Salir</button>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{titulo}</h1>
          <div className="mt-4">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-xs opacity-70 uppercase tracking-wide">Se debe</p>
              <p className={`text-4xl font-bold mt-1 ${saldo > 0 ? "text-red-300" : "text-green-300"}`}>
                ${saldo.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Order form */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-semibold">Generar Pedido</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Contado</p>
              <p className="text-lg font-bold text-green-700">${(user.valor_contado || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">por unidad</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">A Cuenta</p>
              <p className="text-lg font-bold text-blue-700">${(user.valor_cuenta || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">por unidad</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Cantidad</label>
            <Input
              type="number"
              placeholder="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 text-xl font-bold h-14 text-center"
              min="1"
            />
          </div>
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
          <Button onClick={handlePedido} disabled={submitting} className="w-full h-12 text-sm font-semibold gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Enviando..." : "Enviar Pedido"}
          </Button>
        </div>

        {/* Movimientos */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setHistorialOpen(o => !o)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Últimos movimientos</span>
            </div>
            {historialOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {historialOpen && (
            <div className="px-4 pb-4">
              {pedidos.length === 0 && pagos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos aún</p>
              ) : (
                <div className="space-y-1.5">
                  {[
                    ...pedidos.filter(p => p.estado === "entregado").map(p => ({ ...p, _tipo: p.tipo_pago === "contado" ? "contado" : "cuenta", _fecha: p.fecha })),
                    ...pagos.filter(p => p.referencia !== "Pago contado automático").map(p => ({ ...p, _tipo: "pago", _fecha: p.fecha })),
                  ]
                    .sort((a, b) => new Date(b._fecha) - new Date(a._fecha))
                    .map((m, i) => {
                      const isPago = m._tipo === "pago";
                      const isContado = m._tipo === "contado";
                      const montoVal = isPago ? m.monto : m.total;
                      const isDebe = (!isPago && !isContado) || (isPago && m.monto < 0);
                      const bgClass = isContado ? "bg-yellow-50 border-yellow-200" : isDebe ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
                      const labelClass = isContado ? "text-yellow-700" : isDebe ? "text-red-700" : "text-green-700";
                      const label = isContado ? "Contado" : isDebe ? "Debe" : "Pago";
                      return (
                        <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg border ${bgClass}`}>
                          <div>
                            <p className="text-xs text-muted-foreground">{moment(m._fecha).format("DD/MM/YY")}</p>
                            <p className={`font-semibold text-xs ${labelClass}`}>{label}</p>
                            {!isPago && <p className="text-xs text-muted-foreground">{m.cantidad} unidades</p>}
                          </div>
                          {!isContado && <p className={`font-bold text-sm ${labelClass}`}>${Math.abs(montoVal || 0).toLocaleString()}</p>}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <NotificacionesConfig userEmail={user.email} />


      </div>
      <ChatUsuario user={user} open={chatOpen} onClose={() => setChatOpen(false)} onUnread={setChatNoLeidos} />
    </div>
  );
}