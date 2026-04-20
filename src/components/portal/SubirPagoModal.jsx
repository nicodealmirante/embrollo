import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { notificarPagoWA } from "@/functions/notificarPagoWA";

export default function SubirPagoModal({ user, open, onClose, onSuccess }) {
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("transferencia");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [comprobante, setComprobante] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      toast({ title: "Ingresá un monto válido", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let comprobante_url = null;
    if (comprobante) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: comprobante });
      comprobante_url = file_url;
      setUploading(false);
    }

    const pagoData = {
      usuario_email: user.email,
      usuario_nombre: user.full_name || user.email,
      fecha: new Date().toISOString(),
      monto: parseFloat(monto),
      metodo,
      referencia: referencia.trim(),
      observaciones: observaciones.trim(),
      comprobante_url,
      estado: "pendiente",
      origen: "usuario",
    };
    await base44.entities.Pago.create(pagoData);
    notificarPagoWA({ data: pagoData }).catch(() => {});

    toast({ title: "Pago enviado", description: "El administrador lo revisará pronto" });
    setSubmitting(false);
    setMonto(""); setMetodo("transferencia"); setReferencia(""); setObservaciones(""); setComprobante(null);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Registrar Pago
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <div>
            <Label className="text-xs">Monto *</Label>
            <Input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0"
              className="mt-1 text-lg font-bold text-center h-12"
            />
          </div>
          <div>
            <Label className="text-xs">Método de pago</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Referencia / N° de operación</Label>
            <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Opcional" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" className="mt-1" rows={2} />
          </div>
          {metodo === "transferencia" && (
            <div>
              <Label className="text-xs">Comprobante (imagen)</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-xl p-3 text-center">
                {comprobante ? (
                  <div className="space-y-1">
                    <p className="text-xs text-green-600 font-medium">✓ {comprobante.name}</p>
                    <button onClick={() => setComprobante(null)} className="text-xs text-muted-foreground underline">Quitar</button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tocá para subir comprobante</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setComprobante(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11">
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {uploading ? "Subiendo comprobante..." : "Enviando..."}</>
            ) : "Enviar pago"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}