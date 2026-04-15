import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { enviarWhatsApp } from "@/functions/enviarWhatsApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Bell, BellOff, Send, Smartphone } from "lucide-react";

const CLAVES = {
  telefono: "whatsapp_telefono",
  apikey: "whatsapp_apikey",
  notif_mensaje: "whatsapp_notif_mensaje",
  notif_pedido: "whatsapp_notif_pedido",
};

async function getConfig() {
  const items = await base44.entities.ConfigApp.filter({});
  const map = {};
  items.forEach(i => { map[i.clave] = i; });
  return map;
}

async function setConfig(clave, valor, existingId) {
  if (existingId) {
    await base44.entities.ConfigApp.update(existingId, { valor });
  } else {
    await base44.entities.ConfigApp.create({ clave, valor });
  }
}

export default function WhatsAppConfigTab() {
  const [telefono, setTelefono] = useState("");
  const [apikey, setApikey] = useState("");
  const [notifMensaje, setNotifMensaje] = useState(true);
  const [notifPedido, setNotifPedido] = useState(true);
  const [configIds, setConfigIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const cfg = await getConfig();
    setTelefono(cfg[CLAVES.telefono]?.valor || "");
    setApikey(cfg[CLAVES.apikey]?.valor || "");
    setNotifMensaje(cfg[CLAVES.notif_mensaje]?.valor !== "false");
    setNotifPedido(cfg[CLAVES.notif_pedido]?.valor !== "false");
    setConfigIds({
      telefono: cfg[CLAVES.telefono]?.id,
      apikey: cfg[CLAVES.apikey]?.id,
      notif_mensaje: cfg[CLAVES.notif_mensaje]?.id,
      notif_pedido: cfg[CLAVES.notif_pedido]?.id,
    });
  }

  async function handleSave() {
    if (!telefono.trim() || !apikey.trim()) {
      toast({ title: "Completá el teléfono y la API key", variant: "destructive" });
      return;
    }
    setSaving(true);
    await Promise.all([
      setConfig(CLAVES.telefono, telefono.trim(), configIds.telefono),
      setConfig(CLAVES.apikey, apikey.trim(), configIds.apikey),
      setConfig(CLAVES.notif_mensaje, String(notifMensaje), configIds.notif_mensaje),
      setConfig(CLAVES.notif_pedido, String(notifPedido), configIds.notif_pedido),
    ]);
    await loadConfig();
    setSaving(false);
    toast({ title: "Configuración guardada" });
  }

  async function handleTest() {
    if (!telefono.trim() || !apikey.trim()) {
      toast({ title: "Completá el teléfono y la API key primero", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const res = await enviarWhatsApp({
        telefono: telefono.trim(),
        apikey: apikey.trim(),
        mensaje: "✅ Prueba de notificación desde Embrollo. ¡Funciona correctamente!",
      });
      if (res.data?.ok) {
        toast({ title: "Mensaje de prueba enviado ✓" });
      } else {
        toast({ title: "Error al enviar", description: res.data?.response || "Verificá los datos", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    }
    setTesting(false);
  }

  return (
    <div className="space-y-5">
      {/* Instrucciones */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-green-700" />
          <p className="text-sm font-semibold text-green-800">Cómo obtener tu API key de CallMeBot</p>
        </div>
        <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
          <li>Guardá el contacto <strong>+34 644 59 78 06</strong> en tu WhatsApp</li>
          <li>Enviá el mensaje: <strong>I allow callmebot to send me messages</strong></li>
          <li>Recibirás tu API key por WhatsApp en unos minutos</li>
          <li>Ingresala abajo junto con tu número de teléfono</li>
        </ol>
      </div>

      {/* Credenciales */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Configuración de envío</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Número de teléfono destino</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Con código de país, sin + ni espacios. Ej: 5491123456789</p>
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

      {/* Interruptores */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Notificaciones activas</h3>
        </div>

        <div className="space-y-3">
          <Toggle
            label="Nuevo mensaje de usuario"
            description="Notificar cuando un usuario envíe un mensaje en el chat"
            value={notifMensaje}
            onChange={setNotifMensaje}
          />
          <Toggle
            label="Nuevo pedido recibido"
            description="Notificar cuando se registre un nuevo pedido"
            value={notifPedido}
            onChange={setNotifPedido}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {/* Plantillas */}
      <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vista previa de mensajes</p>
        <div className="space-y-2">
          <div className="bg-white rounded-lg border border-border p-3">
            <p className="text-[10px] font-semibold text-green-700 mb-1">💬 Nuevo mensaje</p>
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{`💬 Nuevo mensaje en Embrollo\n👤 Cliente: [nombre]\n📧 Email: [email]\n📝 Mensaje: [texto]\n🕐 [fecha/hora]`}</p>
          </div>
          <div className="bg-white rounded-lg border border-border p-3">
            <p className="text-[10px] font-semibold text-blue-700 mb-1">📦 Nuevo pedido</p>
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{`📦 Nuevo pedido en Embrollo\n👤 Cliente: [nombre]\n📧 Email: [email]\n🔢 Cantidad: [cant] unidades\n📝 Obs: [observaciones]\n🕐 [fecha/hora]`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}