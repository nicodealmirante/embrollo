import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function GestionItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio_contado: 0, precio_cuenta: 0, activo: true, imagen: "", orden: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const data = await base44.entities.Item.list("orden");
    setItems(data);
    setLoading(false);
  }

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", descripcion: "", precio_contado: 0, precio_cuenta: 0, activo: true, imagen: "", orden: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      precio_contado: item.precio_contado || 0,
      precio_cuenta: item.precio_cuenta || 0,
      activo: item.activo !== false,
      imagen: item.imagen || "",
      orden: item.orden || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    if (editing) {
      await base44.entities.Item.update(editing.id, form);
      toast({ title: "Actualizado", description: "Ítem actualizado correctamente" });
    } else {
      await base44.entities.Item.create(form);
      toast({ title: "Creado", description: "Ítem creado correctamente" });
    }
    setDialogOpen(false);
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este ítem?")) return;
    await base44.entities.Item.delete(id);
    toast({ title: "Eliminado", description: "Ítem eliminado" });
    loadItems();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, imagen: file_url }));
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
      <div className="flex items-center justify-between mb-6 pt-2 lg:pt-0">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Ítems</h1>
          <p className="text-sm text-muted-foreground">{items.length} productos</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nuevo Ítem
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
            {item.imagen ? (
              <div className="aspect-video overflow-hidden bg-muted">
                <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Package className="w-10 h-10 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{item.nombre}</h3>
                  {item.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.descripcion}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      C: ${item.precio_contado || 0}
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Cta: ${item.precio_cuenta || 0}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.activo !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {item.activo !== false ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(item)}>
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive gap-1" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-3 h-3" /> Eliminar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Ítem" : "Nuevo Ítem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Precio Contado</Label>
                <Input type="number" value={form.precio_contado} onChange={(e) => setForm((f) => ({ ...f, precio_contado: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Precio a Cuenta</Label>
                <Input type="number" value={form.precio_cuenta} onChange={(e) => setForm((f) => ({ ...f, precio_cuenta: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Orden</Label>
                <Input type="number" value={form.orden} onChange={(e) => setForm((f) => ({ ...f, orden: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Imagen</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} className="mt-1" />
              {form.imagen && (
                <img src={form.imagen} alt="preview" className="mt-2 h-20 rounded-lg object-cover" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.activo} onCheckedChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
              <Label className="text-xs">Activo</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? "Guardar Cambios" : "Crear Ítem"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}