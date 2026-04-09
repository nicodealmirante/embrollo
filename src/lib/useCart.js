import { useState, useCallback } from "react";

export function useCart() {
  const [cart, setCart] = useState([]);

  const addItem = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c
        );
      }
      return [...prev, { item, cantidad: 1 }];
    });
  }, []);

  const updateCantidad = useCallback((itemId, cantidad) => {
    if (cantidad < 1) return;
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, cantidad } : c))
    );
  }, []);

  const removeItem = useCallback((itemId) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const totalItems = cart.reduce((sum, c) => sum + c.cantidad, 0);

  return { cart, addItem, updateCantidad, removeItem, clearCart, totalItems };
}