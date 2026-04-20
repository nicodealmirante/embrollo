import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Bell, Smartphone } from "lucide-react";

const CLAVES = {
  telefono: "whatsapp_telefono",
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
  const [notifMensaje, setNotifMensaje] = useState(true);
  const [notifPedido, setNotifPedido] = useState(true);
  const [configIds, setConfigIds] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const cfg = await getConfig();
    setTelefono(cfg[CLAVES.telefono]?.valor || "");
    setNotifMensaje(cfg[CLAVES.notif_mensaje]?.valor !== "false");
    setNotifPedido(cfg[CLAVES.notif_pedido]?.valor !== "false");
    setConfigIds({
      telefono: cfg[CLAVES.telefono]?.id,
      notif_mensaje: cfg[CLAVES.notif_mensaje]?.id,
      notif_pedido: cfg[CLAVES.notif_pedido]?.id,
    });
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all([
      setConfig(CLAVES.telefono, telefono.trim(), configIds.telefono),
      setConfig(CLAVES.notif_mensaje, String(notifMensaje), configIds.notif_mensaje),
      setConfig(CLAVES.notif_pedido, String(notifPedido), configIds.notif_pedido),
    ]);
    await loadConfig();
    setSaving(false);
    toast({ title: "Configuración guardada" });
  }

  return (
    <div className="space-y-5">
      {/* Teléfono admin */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Número WhatsApp del administrador</h3>
        </div>
        <div>
          <Label className="text-xs">Número destino de notificaciones</Label>
          <p className="text-[10px] text-muted-foreground mb-1">Con código de país, sin + ni espacios. Ej: 5491123456789</p>
          <Input
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="5491123456789"
            className="mt-1 font-mono text-sm"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
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

      {/* Vista previa */}
      <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vista previa de mensajes</p>
        <div className="space-y-2">
          <div className="bg-white rounded-lg border border-border p-3">
            <p className="text-[10px] font-semibold text-green-700 mb-1">💬 Nuevo mensaje</p>
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{`💬 Nuevo mensaje en Embrollo\n👤 Cliente: [nombre]\n📧 Email: [email]\n📝 Mensaje: [texto]`}</p>
          </div>
          <div className="bg-white rounded-lg border border-border p-3">
            <p className="text-[10px] font-semibold text-blue-700 mb-1">📦 Nuevo pedido</p>
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{`📦 Nuevo pedido en Embrollo\n👤 Cliente: [nombre]\n📧 Email: [email]\n🔢 Cantidad: [cant] unidades`}</p>
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