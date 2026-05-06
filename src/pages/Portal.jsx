import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRoleNames } from "@/hooks/useRoleNames";
import { crearPedidoPublico } from "@/functions/crearPedidoPublico";
import { notificarPedidoWA } from "@/functions/notificarPedidoWA";
import { ClipboardList, Loader2, Send, ChevronDown, ChevronUp, MessageCircle, DollarSign, PackagePlus, Plus, Minus, Wallet, Settings } from "lucide-react";
import ChatUsuario from "../components/ChatUsuario";
import NotificacionesConfig from "../components/NotificacionesConfig";
import TelefonoConfig from "../components/TelefonoConfig";
import SubirPagoModal from "../components/portal/SubirPagoModal";
import TorneoPuestoCard from "../components/portal/TorneoPuestoCard";
import ContadorBanner from "../components/portal/ContadorBanner";
import { obtenerDatosTorneo } from "@/functions/obtenerDatosTorneo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";
import { getNombreVisible } from "@/lib/utils";

export default function Portal() {
  const [user, setUser] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [todosPagos, setTodosPagos] = useState([]);
  const [torneoConfig, setTorneoConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatNoLeidos, setChatNoLeidos] = useState(0);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pedidoModalOpen, setPedidoModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { adminName } = useRoleNames();

  useEffect(() => {loadData();}, []);

  async function loadData() {
    setLoading(true);
    let me;
    try {
      me = await base44.auth.me();
    } catch (e) {
      console.error(e);
      base44.auth.redirectToLogin();
      return;
    }

    if (me.role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    setUser(me);

    if (me?.estado === "activo") {
      try {
        const [ped, pag, torneoResp, userActualizado] = await Promise.all([
        base44.entities.Pedido.filter({ usuario_email: me.email }, "-created_date"),
        base44.entities.Pago.filter({ usuario_email: me.email }, "-created_date"),
        obtenerDatosTorneo({}),
        base44.entities.User.get(me.id)]
        );
        setUser(userActualizado);
        setPedidos(ped);
        setPagos(pag);
        if (torneoResp?.data) {
          setTodosUsuarios(torneoResp.data.users || []);
          setTodosPedidos(torneoResp.data.pedidos || []);
          setTodosPagos(torneoResp.data.pagos || []);
          const cfg = {};
          (torneoResp.data.configs || []).forEach((c) => {
            if (c.clave) cfg[c.clave] = c.valor;
          });
          setTorneoConfig(cfg);
        }
      } catch (dataErr) {
        console.error("Error loading data", dataErr);
      }
    }
    setLoading(false);
  }

  const totalPedido = pedidos.filter((p) => p.estado !== "cancelado").reduce((s, p) => {
    let total = Number(p.total) || 0;
    if (total <= 0 && p.estado === "entregado") {
      let valorUsado = Number(p.valor_usado) || 0;
      if (valorUsado <= 0) {
        valorUsado = p.tipo_pago === "contado" ? Number(user.valor_contado) || 0 : Number(user.valor_cuenta) || 0;
      }
      total = (Number(p.cantidad) || 0) * valorUsado;
    }
    return s + total;
  }, 0);
  const totalPagado = pagos.filter((p) => p.estado !== "rechazado").reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = totalPedido - totalPagado;
  const pedidosPendientes = pedidos.filter((p) => p.estado === "pendiente").length;
  const ultimoPedido = pedidos.filter((p) => p.estado !== "cancelado").sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;
  const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString("es-AR")}`;

  const sumarCantidad = (valor) => {
    const actual = parseFloat(cantidad) || 0;
    setCantidad(String(Math.max(1, actual + valor)));
  };

  const handlePedido = async () => {
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) {
      toast({ title: "Error", description: "Ingrese una cantidad válida", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await crearPedidoPublico({ useEmail: true, cantidad: cant, observaciones });
    notificarPedidoWA({ data: { usuario_email: user.email, usuario_nombre: getNombreVisible(user), cantidad: cant, observaciones } }).catch(() => {});
    toast({ title: "Pedido enviado", description: "Tu pedido fue registrado" });
    setSubmitting(false);
    setCantidad("");
    setObservaciones("");
    setPedidoModalOpen(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

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
      </div>);

  }

  const titulo = getNombreVisible(user);
  const cantidadActual = parseFloat(cantidad) || 0;

  const isContadorActivo = user.contador_estado === "activo" && user.contador_fin && moment(user.contador_fin).isAfter(moment());
  const valorActual = isContadorActivo ? user.valor_contador_activo || 0 : user.valor_contado || user.valor_cuenta || 0;

  const estimadoTotal = cantidadActual * valorActual;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-sm relative">
          <div className="mb-1 mx-1 pr-3 pl-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-80">Bienvenido/a</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfigModalOpen(true)}
                  className="relative rounded-full bg-white/10 p-2 text-primary-foreground opacity-90 transition hover:bg-white/20 hover:opacity-100">
                  
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setChatOpen(true)}
                  className="relative rounded-full bg-white/10 p-2 text-primary-foreground opacity-90 transition hover:bg-white/20 hover:opacity-100">
                  
                  <MessageCircle className="w-5 h-5" />
                  {chatNoLeidos > 0 &&
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                      {chatNoLeidos}
                    </span>
                  }
                </button>
                <button onClick={() => base44.auth.logout()} className="text-xs opacity-70 hover:opacity-100 underline">
                  Salir
                </button>
              </div>
            </div>
            <h1 className="text-2xl font-black leading-tight">{titulo}</h1>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="col-span-2 rounded-2xl bg-white/10 text-center ring-1 ring-white/10 mx-4 py-2">
                <p className="text-xs uppercase tracking-wide opacity-70">Saldo actual</p>
                <p className={`mt-1 text-4xl font-black ${saldo > 0 ? "text-red-200" : "text-green-200"}`}>{formatMoney(saldo)}</p>
              </div>
              


              
              


              
            </div>
          </div>
        </div>

        {torneoConfig.torneo_activo !== "false" &&
        <TorneoPuestoCard user={user} users={todosUsuarios} pedidos={todosPedidos} pagos={todosPagos} config={torneoConfig} />
        }

        <ContadorBanner user={user} config={torneoConfig} />

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button className="h-14 gap-2 rounded-2xl font-bold shadow-sm" onClick={() => setPedidoModalOpen(true)}>
            <PackagePlus className="w-5 h-5" /> Realizar pedido
          </Button>
          <Button variant="outline" className="h-14 gap-2 rounded-2xl border-green-300 text-green-700 hover:bg-green-50 font-bold shadow-sm" onClick={() => setPagoModalOpen(true)}>
            <DollarSign className="w-5 h-5" /> Informar pago
          </Button>
          <Button variant="outline" className="col-span-2 h-12 gap-2 rounded-2xl font-semibold shadow-sm" onClick={() => setHistorialOpen(true)}>
            <ClipboardList className="w-4 h-4 text-muted-foreground" /> Historial
          </Button>
        </div>

      </div>

      <Dialog open={pedidoModalOpen} onOpenChange={setPedidoModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <PackagePlus className="w-5 h-5 text-primary" /> Solicitar pedido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valor actual</p>
              <p className="text-2xl font-black text-primary mt-1">{formatMoney(valorActual)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Este valor se aplica a su pedido.</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Cantidad</label>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" className="h-14 w-12 rounded-2xl" onClick={() => sumarCantidad(-1)}><Minus className="h-4 w-4" /></Button>
                <Input type="number" placeholder="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="h-14 rounded-2xl text-center text-2xl font-black" min="1" />
                <Button type="button" variant="outline" className="h-14 w-12 rounded-2xl" onClick={() => sumarCantidad(1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[5, 10, 20].map((n) => <Button key={n} type="button" variant="outline" className="h-9 rounded-xl text-xs" onClick={() => sumarCantidad(n)}>+{n}</Button>)}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4 text-center">
              <p className="flex justify-center items-center gap-1 text-xs font-medium text-muted-foreground"><Wallet className="h-4 w-4" /> Total Estimado</p>
              <p className="text-xl font-black text-primary mt-1">{formatMoney(estimadoTotal)}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Observaciones (opcional)</label>
              <Textarea placeholder="Notas del pedido..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="mt-1 resize-none rounded-2xl text-sm" rows={2} />
            </div>
            <Button onClick={handlePedido} disabled={submitting} className="w-full min-h-12 rounded-2xl text-sm font-bold gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Enviando..." : "Solicitar pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <ClipboardList className="w-5 h-5 text-muted-foreground" /> Últimos movimientos
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {pedidos.length === 0 && pagos.length === 0 ?
            <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos aún</p> :

            <div className="space-y-2">
                {[
              ...pedidos.filter((p) => p.estado === "entregado").map((p) => ({ ...p, _tipo: p.tipo_pago === "contado" ? "contado" : "cuenta", _fecha: p.fecha })),
              ...pagos.filter((p) => p.referencia !== "Pago contado automático").map((p) => ({ ...p, _tipo: "pago", _fecha: p.fecha }))].

              sort((a, b) => new Date(b._fecha) - new Date(a._fecha)).
              map((m, i) => {
                const isPago = m._tipo === "pago";
                const isContado = m._tipo === "contado";

                let montoVal = 0;
                if (isPago) {
                  montoVal = m.monto;
                } else {
                  montoVal = Number(m.total) || 0;
                  if (montoVal <= 0) {
                    let valorUsado = Number(m.valor_usado) || 0;
                    if (valorUsado <= 0) {
                      valorUsado = m.tipo_pago === "contado" ? Number(user.valor_contado) || 0 : Number(user.valor_cuenta) || 0;
                    }
                    montoVal = (Number(m.cantidad) || 0) * valorUsado;
                  }
                }

                const isDebe = !isPago && !isContado || isPago && m.monto < 0;
                const bgClass = isContado ? "bg-yellow-50 border-yellow-200" : isDebe ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
                const labelClass = isContado ? "text-yellow-700" : isDebe ? "text-red-700" : "text-green-700";
                const label = isContado ? "Contado" : isDebe ? "Debe" : "Pago";
                return (
                  <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-xl border ${bgClass}`}>
                        <div>
                          <p className="text-xs text-muted-foreground">{moment(m._fecha).format("DD/MM/YY")}</p>
                          <p className={`font-semibold text-sm ${labelClass}`}>{label}</p>
                          {!isPago && <p className="text-xs text-muted-foreground">{m.cantidad} unidades</p>}
                        </div>
                        <p className={`font-bold text-base ${labelClass}`}>${Math.abs(montoVal || 0).toLocaleString()}</p>
                      </div>);

              })}
              </div>
            }
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Settings className="w-5 h-5 text-muted-foreground" /> Configuración
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <TelefonoConfig user={user} onSaved={loadData} />
            <NotificacionesConfig userEmail={user.email} />
          </div>
        </DialogContent>
      </Dialog>
      <ChatUsuario user={user} open={chatOpen} onClose={() => setChatOpen(false)} onUnread={setChatNoLeidos} />
      <SubirPagoModal user={user} open={pagoModalOpen} onClose={() => setPagoModalOpen(false)} onSuccess={loadData} />
    </div>);

}