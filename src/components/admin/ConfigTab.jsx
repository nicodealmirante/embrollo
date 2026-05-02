import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { saveRoleNames, useRoleNames } from "@/hooks/useRoleNames";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Shield, User, MessageSquare, Bell } from "lucide-react";
import WhatsAppConfigTab from "@/components/admin/WhatsAppConfigTab";
import NotificacionesConfig from "@/components/NotificacionesConfig";

export default function ConfigTab() {
  const { adminName, userName } = useRoleNames();
  const [adminInput, setAdminInput] = useState(adminName);
  const [userInput, setUserInput] = useState(userName);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState("roles");
  const [me, setMe] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    setAdminInput(adminName);
    setUserInput(userName);
  }, [adminName, userName]);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => setMe(null));
  }, []);

  const handleSave = async () => {
    if (!adminInput.trim() || !userInput.trim()) {
      toast({ title: "Error", description: "Los nombres no pueden estar vacíos", variant: "destructive" });
      return;
    }
    setSaving(true);
    await saveRoleNames(adminInput.trim(), userInput.trim());
    setSaving(false);
    toast({ title: "Configuración guardada" });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl">
        <button
          onClick={() => setSubTab("roles")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${subTab === "roles" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <Settings className="w-3.5 h-3.5" /> Roles
        </button>
        <button
          onClick={() => setSubTab("whatsapp")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${subTab === "whatsapp" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
        </button>
        <button
          onClick={() => setSubTab("push")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${subTab === "push" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <Bell className="w-3.5 h-3.5" /> Push
        </button>
      </div>

      {subTab === "whatsapp" && <WhatsAppConfigTab />}

      {subTab === "push" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Notificaciones push</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Activá este dispositivo para recibir avisos cuando entren pedidos, pagos o mensajes.
              En celular conviene abrir la app desde el ícono instalado en pantalla principal.
            </p>
            {me?.email ? (
              <NotificacionesConfig userEmail={me.email} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Cargando usuario administrador...
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 font-semibold mb-1">Configuración necesaria</p>
            <p className="text-xs text-amber-600">
              Para que las push funcionen, Base44 debe tener configuradas las variables <strong>VITE_VAPID_PUBLIC_KEY</strong>, <strong>VAPID_PUBLIC_KEY</strong> y <strong>VAPID_PRIVATE_KEY</strong>.
            </p>
          </div>
        </div>
      )}

      {subTab === "roles" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Nombres de Roles</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Personalizá cómo se llaman los roles en toda la interfaz. La lógica interna no cambia.
            </p>

            <div className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">Nombre visible del rol Admin</Label>
                </div>
                <Input value={adminInput} onChange={(e) => setAdminInput(e.target.value)} placeholder="Admin" className="mt-1" />
              </div>

              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Nombre visible del rol Usuario</Label>
                </div>
                <Input value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Usuario" className="mt-1" />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 font-semibold mb-1">ℹ️ Nota sobre roles duales</p>
            <p className="text-xs text-amber-600">
              Un usuario con rol <strong>admin</strong> siempre accede al panel de administración. Si necesitás que un admin también use el portal de usuario, podés asignarle ambos accesos editando su perfil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
