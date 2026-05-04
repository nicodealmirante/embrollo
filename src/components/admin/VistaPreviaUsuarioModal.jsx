import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, PackagePlus, ClipboardList, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TorneoPuestoCard from "../portal/TorneoPuestoCard";
import { obtenerDatosTorneo } from "@/functions/obtenerDatosTorneo";
import { getNombreVisible } from "@/lib/utils";

export default function VistaPreviaUsuarioModal({ open, onClose, usuariosActivos }) {
  const [previewUserEmail, setPreviewUserEmail] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [torneoConfig, setTorneoConfig] = useState({});
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [todosPagos, setTodosPagos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && usuariosActivos.length > 0 && !previewUserEmail) {
      setPreviewUserEmail(usuariosActivos[0].email);
    }
  }, [open, usuariosActivos]);

  useEffect(() => {
    if (open && previewUserEmail) {
      loadUserData(previewUserEmail);
    }
  }, [open, previewUserEmail]);

  async function loadUserData(email) {
    setLoading(true);
    try {
      const [ped, pag, torneoResp] = await Promise.all([
        base44.entities.Pedido.filter({ usuario_email: email }, "-created_date"),
        base44.entities.Pago.filter({ usuario_email: email }),
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const currentUser = usuariosActivos.find(u => u.email === previewUserEmail);
  const totalPedido = pedidos.filter(p => p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
  const totalPagado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const saldo = totalPedido - totalPagado;

  const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString("es-AR")}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background overflow-hidden p-0 rounded-3xl border border-border shadow-xl">
        <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-base">Vista previa usuario</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {usuariosActivos.length > 0 ? (
            <Select value={previewUserEmail} onValueChange={setPreviewUserEmail}>
              <SelectTrigger className="w-full bg-card h-12 rounded-xl">
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {usuariosActivos.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {getNombreVisible(u)} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No hay usuarios activos disponibles.</p>
          )}

          {currentUser && !loading && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-5 text-center shadow-sm">
                <p className="text-xs opacity-80 uppercase tracking-wider font-semibold mb-1">Visualizando a</p>
                <h3 className="text-2xl font-black mb-4">{getNombreVisible(currentUser)}</h3>
                <div className="bg-white/10 rounded-2xl p-4 inline-block w-full">
                  <p className="text-xs uppercase tracking-wide opacity-70 font-medium">Saldo actual</p>
                  <p className={`mt-1 text-4xl font-black ${saldo > 0 ? "text-red-200" : "text-green-200"}`}>
                    {formatMoney(saldo)}
                  </p>
                </div>
              </div>

              {torneoConfig.torneo_activo !== "false" && (
                <TorneoPuestoCard user={currentUser} users={todosUsuarios} pedidos={todosPedidos} pagos={todosPagos} config={torneoConfig} />
              )}

              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button className="h-14 gap-2 rounded-2xl font-bold opacity-70 pointer-events-none">
                  <PackagePlus className="w-5 h-5" /> Realizar pedido
                </Button>
                <Button variant="outline" className="h-14 gap-2 rounded-2xl border-green-300 text-green-700 font-bold opacity-70 pointer-events-none">
                  <DollarSign className="w-5 h-5" /> Informar pago
                </Button>
                <Button variant="outline" className="col-span-2 h-12 gap-2 rounded-2xl font-semibold opacity-70 pointer-events-none mt-1">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" /> Historial
                </Button>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-muted/30">
          <Button variant="outline" className="w-full rounded-xl h-12 font-bold" onClick={onClose}>
            Cerrar vista previa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}