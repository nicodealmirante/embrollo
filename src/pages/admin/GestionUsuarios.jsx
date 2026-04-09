import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function GestionUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const data = await base44.entities.User.list();
    setUsers(data);
    setLoading(false);
  }

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditValue(String(user.multiplicador || 1));
  };

  const saveMultiplicador = async (userId) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Error", description: "Ingrese un número válido mayor a 0", variant: "destructive" });
      return;
    }
    await base44.entities.User.update(userId, { multiplicador: val });
    setEditingId(null);
    toast({ title: "Actualizado", description: "Multiplicador guardado" });
    loadUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 pt-2 lg:pt-0">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold">Nombre</th>
                <th className="text-left p-3 font-semibold">Email</th>
                <th className="text-left p-3 font-semibold">Rol</th>
                <th className="text-left p-3 font-semibold">Multiplicador</th>
                <th className="text-right p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{user.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.role === "admin" ? "Admin" : "Usuario"}
                    </span>
                  </td>
                  <td className="p-3">
                    {editingId === user.id ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-8 text-sm"
                        step="0.01"
                        min="0.01"
                      />
                    ) : (
                      <span className="font-semibold">×{user.multiplicador || 1}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {editingId === user.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => saveMultiplicador(user.id)}
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(user)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}