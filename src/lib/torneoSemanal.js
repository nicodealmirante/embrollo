export const PREMIO_TORNEO_UNIDADES = 80;
export const PREMIO_TORNEO_DESCUENTO_DEUDA = 80000;

export function getInicioSemanaArgentina(date = new Date()) {
  const argentinaNow = new Date(date.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const day = argentinaNow.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  argentinaNow.setDate(argentinaNow.getDate() + diffToMonday);
  argentinaNow.setHours(0, 0, 0, 0);
  return argentinaNow;
}

export function calcularSaldoUsuario(email, pedidos = [], pagos = [], user = null) {
  const totalPedido = pedidos
    .filter((p) => p.usuario_email === email && p.estado !== "cancelado")
    .reduce((s, p) => {
      let total = Number(p.total) || 0;
      if (total <= 0 && user && p.estado === "entregado") {
        let valor_usado = Number(p.valor_usado) || 0;
        if (valor_usado <= 0) {
          valor_usado = p.tipo_pago === "contado" ? (Number(user.valor_contado) || 0) : (Number(user.valor_cuenta) || 0);
        }
        total = (Number(p.cantidad) || 0) * valor_usado;
      }
      return s + total;
    }, 0);

  const totalPagado = pagos
    .filter((p) => p.usuario_email === email && p.estado !== "rechazado")
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  return totalPedido - totalPagado;
}

export function calcularPremioTorneo(deuda = 0) {
  if (deuda > 0) {
    return {
      tipo: "descuento_deuda",
      descripcion: "$80.000 de descuento en deuda",
      descuentoDeuda: PREMIO_TORNEO_DESCUENTO_DEUDA,
      unidades: 0,
    };
  }

  return {
    tipo: "unidades",
    descripcion: "80 unidades de premio",
    descuentoDeuda: 0,
    unidades: PREMIO_TORNEO_UNIDADES,
  };
}

export function calcularRankingSemanal(users = [], pedidos = [], pagos = [], config = {}) {
  const inicioSemana = getInicioSemanaArgentina();

  return users
    .filter((u) => u.role !== "admin")
    .map((user) => {
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(finSemana.getDate() + 6);
      finSemana.setHours(23, 59, 59, 999);

      const entregadosSemana = pedidos.filter((p) => {
        if (p.usuario_email !== user.email || p.estado !== "entregado") return false;
        const fecha = new Date(p.fecha || p.created_date || p.updated_date || 0);
        return fecha >= inicioSemana && fecha <= finSemana;
      });

      const A = entregadosSemana.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
      const B = Number(config.resultado_calculo || 0); // Toma el valor exacto de la pestaña Cálculo
      const C = Number(user.valor_contado || 0);
      
      const deudaGeneral = calcularSaldoUsuario(user.email, pedidos, pagos, user);
      const puntosBase = (C - B) * A;
      const puntos = puntosBase - deudaGeneral;

      return {
        id: user.id,
        nombre: user.nombre_visible || user.link_titulo || user.full_name || user.email,
        email: user.email,
        unidadesSemana: A,
        costoUnidadDashboardAdmin: B,
        valorContado: C,
        margen: C - B,
        deudaGeneral,
        puntaje: puntos,
        premioSiGana: calcularPremioTorneo(deudaGeneral),
      };
    })
    .sort((a, b) => {
      if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
      return b.unidadesSemana - a.unidadesSemana;
    })
    .map((item, index) => ({ ...item, puesto: index + 1 }));
}