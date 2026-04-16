import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Smartphone, Save, Loader2 } from "lucide-react";

export default function TelefonoConfig({ user, onSaved }) {
  const [telefono, setTelefono] = useState(user?.telefono || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ telefono: telefono.trim() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onSaved) onSaved();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        <p className="font-semibold text-sm">Tu número de WhatsApp</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Con código de país, sin + ni espacios. Ej: <strong>5491123456789</strong>
      </p>
      <div className="flex gap-2">
        <Input
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
          placeholder="5491123456789"
          className="font-mono text-sm"
          type="tel"
        />
        <Button size="sm" onClick={handleSave} disabled={saving} className="shrink-0 gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? "✓" : <Save className="w-3.5 h-3.5" />}
          {saved ? "Guardado" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}