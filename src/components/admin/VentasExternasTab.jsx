import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Edit, Search, Filter, Store, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function VentasExternasTab() {
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(getEmptyForm());
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.VentaExterna.list("-fecha");
    setVentas(data);
  }

  function getEmptyForm() {
    return {
      cliente_nombre: "",
      cliente_telefono: "",
      cantidad: "1",
      precio_unitario: "",
      total: "",
      estado_pago: "pago",
      monto_pagado: "",
      observaciones: "",
      fecha: moment().format("YYYY-MM-DDTHH:mm")
    };
  }

  const openNew = () => {
    setForm(getEmptyForm());
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (venta) => {
    setForm({
      id: venta.id,
      cliente_nombre: venta.cliente_nombre || "",
      cliente_telefono: venta.cliente_telefono || "",
      cantidad: String(venta.cantidad || 1),
      precio_unitario: venta.precio_unitario !== undefined && venta.precio_unitario !== null ? String(venta.precio_unitario) : "",
      total: venta.total !== undefined && venta.total !== null ? String(venta.total) : "",
      estado_pago: venta.estado_pago || "pago",
      monto_pagado: venta.monto_pagado !== undefined && venta.monto_pagado !== null ? String(venta.monto_pagado) : "",
      observaciones: venta.observaciones || "",
      fecha: moment(venta.fecha).format("YYYY-MM-DDTHH:mm")
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const calcularTotal = (c, p) => {
    const cant = parseFloat(c);
    const pre = parseFloat(p);
    if (!isNaN(cant) && !isNaN(pre)) {
      setForm(prev => ({ ...prev, total: String(cant * pre) }));
    }
  };

  const saveVenta = async () => {
    if (!form.cliente_nombre.trim() || !form.cantidad || !form.total) {
      toast({ title: "Error", description: "Completá nombre, cantidad y total.", variant: "destructive" });
      return;
    }
    setSaving(true);
    
    const cantidadNum = parseFloat(form.cantidad) || 0;
    const totalNum = parseFloat(form.total) || 0;
    const montoPagadoNum = parseFloat(form.monto_pagado) || 0;
    const precioUnitarioNum = form.precio_unitario ? parseFloat(form.precio_unitario) : null;
    
    const saldo = form.estado_pago === "pago" ? 0 : Math.max(0, totalNum - montoPagadoNum);
    const pagado = form.estado_pago === "pago" ? totalNum : montoPagadoNum;

    const payload = {
      cliente_nombre: form.cliente_nombre.trim(),
      cliente_telefono: form.cliente_telefono.trim(),
      cantidad: cantidadNum,
      precio_unitario: precioUnitarioNum,
      total: totalNum,
      estado_pago: form.estado_pago,
      monto_pagado: pagado,
      saldo_pendiente: saldo,
      observaciones: form.observaciones.trim(),
      fecha: new Date(form.fecha).toISOString(),
    };

    try {
      if (isEditing && form.id) {
        await base44.entities.VentaExterna.update(form.id, payload);
        toast({ title: "Venta actualizada" });
      } else {
        await base44.entities.VentaExterna.create(payload);
        toast({ title: "Venta registrada" });
      }
      setDialogOpen(false);
      loadData();
    } catch (e) {
      toast({ title: "Error", description: "Ocurrió un error al guardar.", variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteVenta = async (id) => {
    if (!confirm("¿Eliminar esta venta externa?")) return;
    await base44.entities.VentaExterna.delete(id);
    toast({ title: "Venta eliminada" });
    loadData();
  };

  const marcarComoPago = async (venta) => {
    await base44.entities.VentaExterna.update(venta.id, {
      estado_pago: "pago",
      monto_pagado: venta.total,
      saldo_pendiente: 0
    });
    toast({ title: "Marcada como paga" });
    loadData();
  };

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return ventas.filter(v => {
      const matchText = `${v.cliente_nombre || ""} ${v.cliente_telefono || ""} ${v.observaciones || ""}`.toLowerCase();
      const matchSearch = !q || matchText.includes(q);
      const matchEstado = estadoFiltro === "todos" || v.estado_pago === estadoFiltro;
      return matchSearch && matchEstado;
    });
  }, [ventas, busqueda, estadoFiltro]);

  const resumen = useMemo(() => {
    let cantTotal = 0;
    let totalVendido = 0;
    let totalCobrado = 0;
    let totalDebe = 0;

    ventas.forEach(v => {
      cantTotal += (v.cantidad || 0);
      totalVendido += (v.total || 0);
      totalCobrado += (v.monto_pagado || 0);
      totalDebe += (v.saldo_pendiente || 0);
    });

    return { cantTotal, totalVendido, totalCobrado, totalDebe };
  }, [ventas]);

  return (
    <div className="space-y-4">
      {/* Resumen Superior */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ventas Externas</p>
            <h2 className="text-xl font-bold">Planilla de Ventas</h2>
            <p className="text-sm text-muted-foreground">Ventas fuera del sistema. No participan de torneos ni rankings.</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
            <Store className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[11px] text-muted-foreground">Prod. Vendidos</p>
            <p className="text-lg font-black">{resumen.cantTotal}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[11px] text-muted-foreground">Total Externo</p>
            <p className="text-lg font-black">${resumen.totalVendido.toLocaleString("es-AR")}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[11px] text-muted-foreground">Cobrado</p>
            <p className="text-lg font-black text-green-600">${resumen.totalCobrado.toLocaleString("es-AR")}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[11px] text-muted-foreground">Deuda Externa</p>
            <p className={`text-lg font-black ${resumen.totalDebe > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              ${resumen.totalDebe.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
      </div>

      {/* Acciones y Filtros */}
      <div className="sticky top-2 z-10 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente o teléfono..." className="h-10 rounded-xl pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="h-10 rounded-xl w-32"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pago">Pagados</SelectItem>
              <SelectItem value="debe">Con deuda</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openNew} className="h-10 rounded-xl gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Nueva venta
          </Button>
        </div>
      </div>

      {/* Lista de ventas */}
      {ventasFiltradas.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No hay ventas externas</p>
        </div>
      )}

      <div className="space-y-3">
        {ventasFiltradas.map((venta) => (
          <div key={venta.id} className={`bg-card rounded-2xl border border-border p-4 shadow-sm ${venta.estado_pago === 'debe' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold">{venta.cliente_nombre} <span className="font-normal text-muted-foreground text-sm ml-1">{venta.cliente_telefono}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{moment(venta.fecha).format("DD/MM/YYYY HH:mm")}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-sm font-semibold bg-muted px-2 py-0.5 rounded-md">{venta.cantidad} uni.</span>
                  {venta.precio_unitario > 0 && <span className="text-sm text-muted-foreground px-2 py-0.5">${venta.precio_unitario.toLocaleString()}/u</span>}
                </div>
              </div>
              <div className="sm:text-right bg-muted/30 p-3 rounded-xl min-w-[140px]">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total</p>
                <p className="text-xl font-black">${(venta.total || 0).toLocaleString("es-AR")}</p>
                {venta.estado_pago === "debe" ? (
                  <p className="text-xs font-bold text-red-600 mt-1">Debe: ${(venta.saldo_pendiente || 0).toLocaleString("es-AR")}</p>
                ) : (
                  <p className="text-xs font-bold text-green-600 mt-1">Pagado 100%</p>
                )}
              </div>
            </div>

            {venta.observaciones && <p className="text-sm text-muted-foreground italic bg-muted/30 p-2 rounded-lg mb-3">{venta.observaciones}</p>}

            <div className="flex flex-wrap gap-2">
              {venta.estado_pago === "debe" && (
                <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => marcarComoPago(venta)}>
                  <CheckCircle className="w-3.5 h-3.5" /> Marcar cobrado
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openEdit(venta)}>
                <Edit className="w-3.5 h-3.5" /> Editar
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-destructive hover:text-destructive sm:ml-auto" onClick={() => deleteVenta(venta.id)}>
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              {isEditing ? "Editar venta externa" : "Nueva venta externa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Cliente *</Label>
              <Input value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))} placeholder="Nombre completo" className="mt-1 bg-muted/30" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Teléfono/Ref.</Label>
                <Input value={form.cliente_telefono} onChange={e => setForm(f => ({ ...f, cliente_telefono: e.target.value }))} placeholder="Opcional" className="mt-1 bg-muted/30" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Fecha</Label>
                <Input type="datetime-local" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="mt-1 bg-muted/30" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Cantidad *</Label>
                  <Input type="number" min="1" value={form.cantidad} onChange={e => {
                    setForm(f => ({ ...f, cantidad: e.target.value }));
                    calcularTotal(e.target.value, form.precio_unitario);
                  }} className="mt-1 bg-white text-lg font-bold" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Precio un. (Opc.)</Label>
                  <Input type="number" value={form.precio_unitario} onChange={e => {
                    setForm(f => ({ ...f, precio_unitario: e.target.value }));
                    calcularTotal(form.cantidad, e.target.value);
                  }} placeholder="0" className="mt-1 bg-white" />
                </div>
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Total a cobrar *</Label>
                <Input type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} placeholder="0" className="mt-1 text-2xl font-black h-12 bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Estado</Label>
                <Select value={form.estado_pago} onValueChange={v => setForm(f => ({ ...f, estado_pago: v }))}>
                  <SelectTrigger className={`mt-1 h-11 font-bold ${form.estado_pago === 'pago' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago" className="text-green-700 font-bold">Cobrado</SelectItem>
                    <SelectItem value="debe" className="text-red-700 font-bold">Debe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.estado_pago === "debe" && (
                <div>
                  <Label className="text-xs font-semibold text-red-600">Monto pagado ($)</Label>
                  <Input type="number" value={form.monto_pagado} onChange={e => setForm(f => ({ ...f, monto_pagado: e.target.value }))} placeholder="0 si no pagó nada" className="mt-1 h-11 border-red-200 focus-visible:ring-red-400" />
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold">Observaciones</Label>
              <Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Notas adicionales..." className="mt-1 bg-muted/30" rows={2} />
            </div>

            <Button onClick={saveVenta} disabled={saving} className="w-full h-12 text-base font-bold rounded-xl mt-2">
              {saving ? "Guardando..." : "Guardar Venta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}