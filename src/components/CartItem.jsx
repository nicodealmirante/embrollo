import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CartItem({ item, cantidad, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.nombre}</h4>
        {item.descripcion && (
          <p className="text-xs text-muted-foreground truncate">{item.descripcion}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdate(item.id, cantidad - 1)}
          disabled={cantidad <= 1}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="text-sm font-semibold w-8 text-center">{cantidad}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdate(item.id, cantidad + 1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}