import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ShoppingBag, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import ItemCard from "../components/ItemCard";
import { useCart } from "../lib/useCart";
import { useToast } from "@/components/ui/use-toast";

// We'll use a global cart context via window for simplicity
if (!window.__cart) {
  window.__cart = { items: [], listeners: new Set() };
}

function getCart() {
  return window.__cart.items;
}

function setCart(items) {
  window.__cart.items = items;
  window.__cart.listeners.forEach((fn) => fn(items));
}

export function useGlobalCart() {
  const [cart, setLocalCart] = useState(getCart());

  useEffect(() => {
    const listener = (items) => setLocalCart([...items]);
    window.__cart.listeners.add(listener);
    return () => window.__cart.listeners.delete(listener);
  }, []);

  const addItem = (item) => {
    const current = getCart();
    const existing = current.find((c) => c.item.id === item.id);
    if (existing) {
      const updated = current.map((c) =>
        c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c
      );
      setCart(updated);
    } else {
      setCart([...current, { item, cantidad: 1 }]);
    }
  };

  const updateCantidad = (itemId, cantidad) => {
    if (cantidad < 1) return;
    const updated = getCart().map((c) =>
      c.item.id === itemId ? { ...c, cantidad } : c
    );
    setCart(updated);
  };

  const removeItem = (itemId) => {
    setCart(getCart().filter((c) => c.item.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, c) => sum + c.cantidad, 0);

  return { cart, addItem, updateCantidad, removeItem, clearCart, totalItems };
}

export default function Catalogo() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const { addItem, totalItems } = useGlobalCart();
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const [itemsData, userData] = await Promise.all([
        base44.entities.Item.filter({ activo: true }, "orden"),
        base44.auth.me(),
      ]);
      setItems(itemsData);
      setUser(userData);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter((i) =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (item) => {
    addItem(item);
    toast({
      title: "Agregado al carrito",
      description: `${item.nombre} añadido`,
      duration: 1500,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Catálogo</h1>
            <p className="text-xs text-muted-foreground">
              Hola, {user?.full_name || "Usuario"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="p-2 rounded-lg bg-primary/10 text-primary"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <Link to="/carrito" className="relative p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} onAdd={handleAdd} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}