import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Send } from "lucide-react";

export default function WhatsAppConfig({ user, onSaved }) {
  const [telefono, setTelefono] = useState(user?.whatsapp_telefono || "");
  const [apikey, setApikey] = useState(user?.whatsapp_apikey || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    if (!telefono.trim() || !apikey.trim()) {
      toast({ title: "Completá el teléfono y la API key", variant: "destructive" });
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({ whatsapp_telefono: telefono.trim(), whatsapp_apikey: apikey.trim() });
    setSaving(false);
    toast({ title: "WhatsApp configurado ✓" });
    if (onSaved) onSaved();
  }

  async function handleTest() {
    if (!telefono.trim() || !apikey.trim()) {
      toast({ title: "Guardá primero los datos", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono.trim())}&text=${encodeURIComponent("✅ Prueba de notificación desde Embrollo. ¡Funciona!")}&apikey=${encodeURIComponent(apikey.trim())}`;
      await fetch(url, { mode: "no-cors" });
      toast({ title: "Mensaje de prueba enviado ✓", description: "Revisá tu WhatsApp en unos segundos" });
    } catch {
      toast({ title: "Error al enviar", variant: "destructive" });
    }
    setTesting(false);
  }

  const configured = !!(user?.whatsapp_telefono && user?.whatsapp_apikey);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${configured ? "bg-green-100" : "bg-muted"}`}>
          <MessageSquare className={`w-4 h-4 ${configured ? "text-green-600" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="text-sm font-semibold">Notificaciones WhatsApp</p>
          <p className="text-xs text-muted-foreground">
            {configured ? "Configurado — recibirás avisos de pedidos y mensajes" : "Configurá para recibir avisos por WhatsApp"}
          </p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-green-800">Cómo obtener tu API key:</p>
        <ol className="text-xs text-green-700 space-y-0.5 list-decimal list-inside">
          <li>Guardá el contacto <strong>+34 644 59 78 06</strong> en WhatsApp</li>
          <li>Enviá: <strong>I allow callmebot to send me messages</strong></li>
          <li>Recibirás tu API key por WhatsApp</li>
        </ol>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Teléfono (con código de país, sin + ni espacios)</Label>
          <Input
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="5491123456789"
            className="mt-1 font-mono text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">API Key de CallMeBot</Label>
          <Input
            value={apikey}
            onChange={e => setApikey(e.target.value)}
            placeholder="123456"
            className="mt-1 font-mono text-sm"
            type="password"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-1.5">
          <Send className="w-3.5 h-3.5" />
          {testing ? "Enviando..." : "Probar"}
        </Button>
      </div>
    </div>
  );
}