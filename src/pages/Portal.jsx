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
import { obtenerDatosTorneo } from "@/functions/obtenerDatosTorneo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";
import { getNombreVisible } from "@/lib/utils";

export default function Portal({ adminPreviewMode = false, previewEmail = null, onExitAdminPreview = null }) {
  const [user, setUser] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [todosPagos, setTodosPagos] = useState([]);
  const [torneoConfig, setTorneoConfig] = useState({});
  const [isPreview, setIsPreview] = useState(false);
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

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      const isPreviewQuery = adminPreviewMode || new URLSearchParams(window.location.search).get("preview") === "true";
      
      let activeUser = me;
      if (me.role === "admin" && isPreviewQuery) {
        setIsPreview(true);
        if (previewEmail) {
          const matchedUser = await base44.entities.User.filter({ email: previewEmail });
          if (matchedUser.length > 0) activeUser = matchedUser[0];
        } else {
          const pedAdmin = await base44.entities.Pedido.filter({ usuario_email: me.email });
          if (pedAdmin.length > 0 || me.estado === "activo") {
            activeUser = me;
          } else {
            const users = await base44.entities.User.list();
            const nonAdminActive = users.filter(u => u.role !== "admin" && u.estado === "activo");
            if (nonAdminActive.length > 0) activeUser = nonAdminActive[0];
          }
        }
      } else if (me.role === "admin") {
        activeUser = { ...me, estado: "activo" };
      }

      setUser(activeUser);
      
      if (activeUser?.estado === "activo" || isPreviewQuery) {
        const [ped, pag, torneoResp] = await Promise.all([
          base44.entities.Pedido.filter({ usuario_email: activeUser.email }, "-created_date"),
          base44.entities.Pago.filter({ usuario_email: activeUser.email }),
          obtenerDatosTorneo({})
        ]);
        setPedidos(ped);
        setPagos(pag);
        if (torneoResp?.data) {
          setTodosUsuarios(torneoResp.data.users || []);
          setTodosPedidos(torneoResp.data.pedidos || []);
          setTodosPagos(torneoResp.data.pagos || []);
          const cfg = {};
          (torneoResp.data.configs || []).forEach(c => {
             if (c.clave) cfg[c.clave] = c.valor;
          });
          setTorneoConfig(cfg);
        }
      }
    } catch (e) {
      console.error(e);
      if (!adminPreviewMode) {
        base44.auth.redirectToLogin();
      }
    }
    setLoading(false);
  }

  const totalPedido = pedidos.filter(p => p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
  const totalPagado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const saldo = totalPedido - totalPagado;
  const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente").length;
  const ultimoPedido = pedidos.filter(p => p.estado !== "cancelado").sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;
  const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString("es-AR")}`;

  const sumarCantidad = (valor) => {
    const actual = parseFloat(cantidad) || 0;
    setCantidad(String(Math.max(1, actual + valor)));
  };

  const handlePedido = async () => {
    if (adminPreviewMode) {
      toast({ title: "Modo vista previa", description: "Acción deshabilitada en la vista previa." });
      return;
    }
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

  const titulo = getNombreVisible(user);
  const cantidadActual = parseFloat(cantidad) || 0;
  const estimadoCuenta = cantidadActual * (user.valor_cuenta || 0);
  const estimadoContado = cantidadActual * (user.valor_contado || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-sm relative">
          {isPreview && (
            <div className="absolute top-0 inset-x-0 bg-red-600 text-center text-[11px] font-bold py-1 z-10 uppercase tracking-widest text-white shadow-md">
              Vista previa admin ({user.email}) 
              <button onClick={() => { if (onExitAdminPreview) onExitAdminPreview(); else navigate('/admin'); }} className="ml-3 underline hover:text-red-100">Volver al admin</button>
            </div>
          )}
          <div className={`p-5 ${isPreview ? "pt-8" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-80">Bienvenido/a</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfigModalOpen(true)}
                  className="relative rounded-full bg-white/10 p-2 text-primary-foreground opacity-90 transition hover:bg-white/20 hover:opacity-100"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (adminPreviewMode) {
                      toast({ title: "Vista previa", description: "Chat deshabilitado." });
                    } else {
                      setChatOpen(true);
                    }
                  }}
                  className="relative rounded-full bg-white/10 p-2 text-primary-foreground opacity-90 transition hover:bg-white/20 hover:opacity-100"
                >
                  <MessageCircle className="w-5 h-5" />
                  {chatNoLeidos > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                      {chatNoLeidos}
                    </span>
                  )}
                </button>
                {user.role === "admin" && !isPreview && (
                  <button onClick={() => navigate('/admin')} className="text-xs opacity-90 hover:opacity-100 underline font-bold bg-white/10 px-2 py-1 rounded-md">
                    Admin
                  </button>
                )}
                <button onClick={() => {
                  if (adminPreviewMode) {
                    if (onExitAdminPreview) onExitAdminPreview();
                  } else {
                    base44.auth.logout();
                  }
                }} className="text-xs opacity-70 hover:opacity-100 underline">
                  {adminPreviewMode ? "Volver" : "Salir"}
                </button>
              </div>
            </div>
            <h1 className="text-2xl font-black leading-tight">{titulo}</h1>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="col-span-2 rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-wide opacity-70">Saldo actual</p>
                <p className={`mt-1 text-4xl font-black ${saldo > 0 ? "text-red-200" : "text-green-200"}`}>{formatMoney(saldo)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                <p className="text-[11px] opacity-70">Pedidos pendientes</p>
                <p className="text-xl font-black">{pedidosPendientes}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                <p className="text-[11px] opacity-70">Último pedido</p>
                <p className="text-sm font-bold">{ultimoPedido ? moment(ultimoPedido.fecha).fromNow() : "Sin pedidos"}</p>
              </div>
            </div>
          </div>
        </div>

        {torneoConfig.torneo_activo !== "false" && (
          <TorneoPuestoCard user={user} users={todosUsuarios} pedidos={todosPedidos} pagos={todosPagos} config={torneoConfig} />
        )}

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button className="h-14 gap-2 rounded-2xl font-bold shadow-sm" onClick={() => {
            if (adminPreviewMode) {
              toast({ title: "Vista previa", description: "Acción deshabilitada." });
            } else {
              setPedidoModalOpen(true);
            }
          }}>
            <PackagePlus className="w-5 h-5" /> Realizar pedido
          </Button>
          <Button variant="outline" className="h-14 gap-2 rounded-2xl border-green-300 text-green-700 hover:bg-green-50 font-bold shadow-sm" onClick={() => {
            if (adminPreviewMode) {
              toast({ title: "Vista previa", description: "Acción deshabilitada." });
            } else {
              setPagoModalOpen(true);
            }
          }}>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Contado</p>
                <p className="text-lg font-black text-green-700">{formatMoney(user.valor_contado || 0)}</p>
                <p className="text-[10px] text-muted-foreground">por unidad</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">A Cuenta</p>
                <p className="text-lg font-black text-blue-700">{formatMoney(user.valor_cuenta || 0)}</p>
                <p className="text-[10px] text-muted-foreground">por unidad</p>
              </div>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border bg-muted/30 p-3">
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Wallet className="h-3 w-3" /> Estimado cuenta</p>
                <p className="text-base font-black text-primary">{formatMoney(estimadoCuenta)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-3">
                <p className="text-[11px] font-medium text-muted-foreground">Estimado contado</p>
                <p className="text-base font-black text-green-700">{formatMoney(estimadoContado)}</p>
              </div>
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
            {pedidos.length === 0 && pagos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos aún</p>
            ) : (
              <div className="space-y-2">
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
                      <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-xl border ${bgClass}`}>
                        <div>
                          <p className="text-xs text-muted-foreground">{moment(m._fecha).format("DD/MM/YY")}</p>
                          <p className={`font-semibold text-sm ${labelClass}`}>{label}</p>
                          {!isPago && <p className="text-xs text-muted-foreground">{m.cantidad} unidades</p>}
                        </div>
                        {!isContado && <p className={`font-bold text-base ${labelClass}`}>${Math.abs(montoVal || 0).toLocaleString()}</p>}
                      </div>
                    );
                  })}
              </div>
            )}
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
    </div>
  );
}