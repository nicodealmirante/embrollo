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

export function calcularSaldoUsuario(email, pedidos = [], pagos = []) {
  const totalPedido = pedidos
    .filter((p) => p.usuario_email === email && p.estado !== "cancelado")
    .reduce((s, p) => s + (Number(p.total) || 0), 0);

  const totalPagado = pagos
    .filter((p) => p.usuario_email === email)
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

export function calcularRankingSemanal(users = [], pedidos = [], pagos = []) {
  const inicioSemana = getInicioSemanaArgentina();

  return users
    .filter((u) => u.role !== "admin")
    .map((user) => {
      const entregadosSemana = pedidos.filter((p) => {
        if (p.usuario_email !== user.email || p.estado !== "entregado") return false;
        const fecha = new Date(p.fecha || p.created_date || p.updated_date || 0);
        return fecha >= inicioSemana;
      });

      const productosVendidos = entregadosSemana.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
      const generado = entregadosSemana.reduce((s, p) => {
        const total = Number(p.total) || ((Number(p.cantidad) || 0) * (Number(p.valor_usado) || 0));
        return s + total;
      }, 0);
      const deuda = calcularSaldoUsuario(user.email, pedidos, pagos);
      const puntaje = generado - deuda;

      return {
        id: user.id,
        nombre: user.full_name || user.email,
        email: user.email,
        productosVendidos,
        generado,
        deuda,
        puntaje,
        premioSiGana: calcularPremioTorneo(deuda),
      };
    })
    .sort((a, b) => {
      if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
      if (b.generado !== a.generado) return b.generado - a.generado;
      return b.productosVendidos - a.productosVendidos;
    })
    .map((item, index) => ({ ...item, puesto: index + 1 }));
}
