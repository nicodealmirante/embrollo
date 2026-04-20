import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function PagosPendientesTab() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadPagos(); }, []);

  async function loadPagos() {
    const data = await base44.entities.Pago.filter({ origen: "usuario", estado: "pendiente" }, "-created_date");
    setPagos(data);
    setLoading(false);
  }

  async function aprobar(pago) {
    await base44.entities.Pago.update(pago.id, { estado: "aprobado" });
    toast({ title: "Pago aprobado ✓" });
    loadPagos();
  }

  async function rechazar(pago) {
    if (!confirm(`¿Rechazar el pago de $${pago.monto?.toLocaleString()} de ${pago.usuario_nombre}?`)) return;
    await base44.entities.Pago.update(pago.id, { estado: "rechazado" });
    toast({ title: "Pago rechazado" });
    loadPagos();
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (pagos.length === 0) return (
    <div className="text-center py-12 text-sm text-muted-foreground">No hay pagos pendientes de revisión</div>
  );

  return (
    <div className="space-y-3">
      {pagos.map(p => (
        <div key={p.id} className="bg-card rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-sm">{p.usuario_nombre || p.usuario_email}</p>
              <p className="text-xs text-muted-foreground">{p.usuario_email}</p>
              <p className="text-xs text-muted-foreground">{moment(p.fecha).format("DD/MM/YY HH:mm")}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-700">${(p.monto || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground capitalize">{p.metodo}</p>
            </div>
          </div>

          {p.referencia && (
            <p className="text-xs text-muted-foreground mb-1">Ref: <strong>{p.referencia}</strong></p>
          )}
          {p.observaciones && (
            <p className="text-xs text-muted-foreground mb-2 italic">{p.observaciones}</p>
          )}
          {p.comprobante_url && (
            <a
              href={p.comprobante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary underline mb-3"
            >
              <ExternalLink className="w-3 h-3" /> Ver comprobante
            </a>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1 bg-green-600 hover:bg-green-700"
              onClick={() => aprobar(p)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => rechazar(p)}
            >
              <XCircle className="w-3.5 h-3.5" /> Rechazar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}