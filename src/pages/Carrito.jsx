import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CartItem from "../components/CartItem";
import { useGlobalCart } from "./Catalogo";
import { useToast } from "@/components/ui/use-toast";

export default function Carrito() {
  const { cart, updateCantidad, removeItem, clearCart, totalItems } = useGlobalCart();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const multiplicador = user?.multiplicador || 1;

  const detalles = cart.map((c) => ({
    ...c,
    valor_calculado: c.cantidad * multiplicador,
  }));

  const total = detalles.reduce((sum, d) => sum + d.valor_calculado, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    const pedido = await base44.entities.Pedido.create({
      usuario_email: user.email,
      usuario_nombre: user.full_name,
      fecha: new Date().toISOString(),
      estado: "pendiente",
      total,
      multiplicador_usado: multiplicador,
      observaciones,
    });

    await base44.entities.DetallePedido.bulkCreate(
      cart.map((c) => ({
        pedido_id: pedido.id,
        item_id: c.item.id,
        item_nombre: c.item.nombre,
        cantidad: c.cantidad,
        valor_calculado: c.cantidad * multiplicador,
      }))
    );

    clearCart();
    setSubmitting(false);
    toast({
      title: "Pedido enviado",
      description: "Tu pedido ha sido creado exitosamente",
    });
    navigate("/mis-pedidos");
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Mi Carrito</h1>
            <p className="text-xs text-muted-foreground">
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega productos desde el catálogo
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
              Ver catálogo
            </Button>
          </div>
        ) : (
          <>
            {cart.map((c) => (
              <CartItem
                key={c.item.id}
                item={c.item}
                cantidad={c.cantidad}
                onUpdate={updateCantidad}
                onRemove={removeItem}
              />
            ))}

            <div className="mt-4">
              <Textarea
                placeholder="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl border border-border p-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Resumen</h3>
              <div className="space-y-2">
                {detalles.map((d) => (
                  <div key={d.item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {d.item.nombre} × {d.cantidad}
                    </span>
                    <span className="font-medium">{d.valor_calculado}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{total}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Multiplicador aplicado: ×{multiplicador}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
              className="w-full h-12 text-sm font-semibold gap-2 mt-4"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? "Enviando..." : "Confirmar Pedido"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}