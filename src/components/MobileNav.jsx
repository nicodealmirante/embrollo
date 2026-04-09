import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, ClipboardList, CreditCard, Store } from "lucide-react";

const navItems = [
  { path: "/", icon: Store, label: "Catálogo" },
  { path: "/carrito", icon: ShoppingBag, label: "Carrito" },
  { path: "/mis-pedidos", icon: ClipboardList, label: "Pedidos" },
  { path: "/mis-pagos", icon: CreditCard, label: "Pagos" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}