import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalculoTab() {
  const [dolar, setDolar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDolar = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("https://dolarapi.com/v1/dolares/blue");
    const data = await res.json();
    setDolar(data.venta);
    setLoading(false);
  };

  useEffect(() => { fetchDolar(); }, []);

  const resultado = dolar != null ? (3800 + dolar) / 1000 : null;

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Cálculo del día</h3>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={fetchDolar} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        ) : (
          <div className="space-y-4">
            {/* Fórmula */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor fijo</span>
                <span className="font-mono font-semibold">3.800</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Dólar blue (venta)</span>
                <span className="font-mono font-semibold text-blue-600">${dolar?.toLocaleString("es-AR")}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center">
                <span className="text-muted-foreground">Suma</span>
                <span className="font-mono font-semibold">{(3800 + dolar).toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">÷ 1000</span>
                <span className="font-mono text-muted-foreground">÷ 1000</span>
              </div>
            </div>

            {/* Resultado destacado */}
            <div className="bg-primary rounded-2xl p-6 text-center text-primary-foreground">
              <p className="text-sm opacity-70 uppercase tracking-widest font-medium mb-1">Resultado</p>
              <p className="text-6xl font-black tracking-tight">
                {resultado.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm opacity-60 mt-1">(3800 + {dolar}) ÷ 1000</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}