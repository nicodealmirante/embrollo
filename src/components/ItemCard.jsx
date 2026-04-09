import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ItemCard({ item, onAdd }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {item.imagen ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={item.imagen}
            alt={item.nombre}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted flex items-center justify-center">
          <Package className="w-12 h-12 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-3.5">
        <h3 className="font-semibold text-sm text-foreground truncate">{item.nombre}</h3>
        {item.descripcion && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descripcion}</p>
        )}
        {item.precio_base > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Ref: ${item.precio_base.toLocaleString()}
          </p>
        )}
        <Button
          size="sm"
          onClick={() => onAdd(item)}
          className="w-full mt-3 gap-1.5 h-9 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </Button>
      </div>
    </div>
  );
}