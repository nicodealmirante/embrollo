import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Calculator, Package, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import moment from "moment";

const CLAVE_FECHA = "fecha_reposicion";

export default function CalculoTab() {
  const [dolar, setDolar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaReposicion, setFechaReposicion] = useState("");
  const [fechaInput, setFechaInput] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [configId, setConfigId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchDolar();
    loadConfig();
  }, []);

  useEffect(() => {
    if (fechaReposicion) loadPedidos();
  }, [fechaReposicion]);

  const fetchDolar = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("https://dolarapi.com/v1/dolares/blue");
    const data = await res.json();
    setDolar(data.venta);
    setLoading(false);
  };

  const loadConfig = async () => {
    const items = await base44.entities.ConfigApp.filter({ clave: CLAVE_FECHA });
    if (items.length > 0) {
      setFechaReposicion(items[0].valor);
      setFechaInput(items[0].valor);
      setConfigId(items[0].id);
    }
  };

  const loadPedidos = async () => {
    const [pedidosData, pagosData] = await Promise.all([
      base44.entities.Pedido.filter({ estado: "entregado" }),
      base44.entities.Pago.list(),
    ]);
    setPedidos(pedidosData);
    setPagos(pagosData);
  };

  const guardarFecha = async (fecha) => {
    setGuardando(true);
    if (configId) {
      await base44.entities.ConfigApp.update(configId, { valor: fecha });
    } else {
      const nuevo = await base44.entities.ConfigApp.create({ clave: CLAVE_FECHA, valor: fecha });
      setConfigId(nuevo.id);
    }
    setFechaReposicion(fecha);
    setGuardando(false);
  };

  const marcarHoy = async () => {
    const hoy = moment().format("YYYY-MM-DD");
    setFechaInput(hoy);
    await guardarFecha(hoy);
  };

  const handleGuardarFecha = async () => {
    if (!fechaInput) return;
    await guardarFecha(fechaInput);
  };

  const resultado = dolar != null ? (3800 + dolar) / 1000 : null;

  const unidadesDesdeReposicion = fechaReposicion
    ? pedidos
        .filter(p => moment(p.fecha).isSameOrAfter(moment(fechaReposicion).startOf("day")))
        .reduce((s, p) => s + (p.cantidad || 0), 0)
    : 0;

  const pagosDesdeReposicion = fechaReposicion
    ? pagos
        .filter(p => moment(p.fecha).isSameOrAfter(moment(fechaReposicion).startOf("day")))
        .reduce((s, p) => s + (p.monto || 0), 0)
    : 0;

  return (
    <div className="space-y-5">

      {/* Cálculo dólar */}
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

      {/* Ventas desde reposición */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Vendido desde última reposición</h3>
        </div>

        {/* Selector de fecha */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Fecha de reposición de productos</p>
          <div className="flex gap-2">
            <Input
              type="date"
              value={fechaInput}
              onChange={e => setFechaInput(e.target.value)}
              className="text-sm flex-1"
            />
            <Button size="sm" variant="outline" className="h-9 text-xs shrink-0" onClick={handleGuardarFecha} disabled={guardando}>
              {guardando ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-9 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={marcarHoy}
            disabled={guardando}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Marcar hoy como día de reposición ({moment().format("DD/MM/YYYY")})
          </Button>
        </div>

        {/* Resultado */}
        {fechaReposicion ? (
          <div className="space-y-3">
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                Desde el {moment(fechaReposicion).format("DD/MM/YYYY")} · Hace {moment(fechaReposicion).fromNow(true)}
              </p>
              <p className="text-5xl font-black text-accent mt-1">
                {unidadesDesdeReposicion.toLocaleString("es-AR")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">unidades vendidas</p>
            </div>

            {resultado != null && unidadesDesdeReposicion > 0 && (
              <>
                {/* Total bruto */}
                <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Resultado</span>
                    <span className="font-mono font-semibold">{resultado.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">× Unidades vendidas</span>
                    <span className="font-mono font-semibold">{unidadesDesdeReposicion.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total bruto</span>
                    <span className="font-mono font-bold text-foreground">
                      ${(resultado * unidadesDesdeReposicion).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Ganancia */}
                {(() => {
                  const totalBruto = pedidos
                    .filter(p => moment(p.fecha).isSameOrAfter(moment(fechaReposicion).startOf("day")))
                    .reduce((s, p) => s + (p.total || 0), 0);
                  const costo = resultado * unidadesDesdeReposicion;
                  const ganancia = totalBruto - costo;
                  const neto = ganancia - pagosDesdeReposicion;
                  return (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total bruto (suma de pedidos)</span>
                          <span className="font-mono font-semibold">${totalBruto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">− Costo ({resultado.toFixed(2).replace(".", ",")} × {unidadesDesdeReposicion} u.)</span>
                          <span className="font-mono font-semibold text-red-500">−${costo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t border-green-200 pt-2 flex justify-between items-center">
                          <span className="text-green-700 font-medium">Ganancia estimada</span>
                          <span className="font-mono font-bold text-green-700">${ganancia.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Pagos recibidos */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700 font-medium">Pagos recibidos</span>
                          <span className="font-mono font-bold text-blue-700">${pagosDesdeReposicion.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-blue-600 opacity-70">Desde el {moment(fechaReposicion).format("DD/MM/YYYY")}</p>
                      </div>

                      {/* Neto */}
                      <div className={`rounded-2xl p-5 text-center border-2 ${neto >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                        <p className={`text-xs uppercase tracking-widest font-medium mb-1 ${neto >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          Ganancia − Pagos recibidos
                        </p>
                        <p className={`text-5xl font-black mt-1 ${neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          ${neto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-xs mt-2 opacity-70 ${neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {neto >= 0 ? "A favor" : "En déficit"}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            Establecé una fecha de reposición para ver el total vendido.
          </p>
        )}
      </div>

    </div>
  );
}