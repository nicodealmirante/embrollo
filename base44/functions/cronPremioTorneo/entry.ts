import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PREMIO_UNIDADES = 80;
const PREMIO_DESCUENTO_DEUDA = 80000;

function getInicioSemanaArgentina(date = new Date()) {
  const argentinaNow = new Date(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const day = argentinaNow.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  argentinaNow.setDate(argentinaNow.getDate() + diffToMonday);
  argentinaNow.setHours(0, 0, 0, 0);
  return argentinaNow;
}

function getSemanaKey(date = new Date()) {
  const inicio = getInicioSemanaArgentina(date);
  return inicio.toISOString().slice(0, 10);
}

function calcularSaldoUsuario(email: string, pedidos: any[] = [], pagos: any[] = []) {
  const totalPedido = pedidos
    .filter((p) => p.usuario_email === email && p.estado !== 'cancelado')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);

  const totalPagado = pagos
    .filter((p) => p.usuario_email === email)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  return totalPedido - totalPagado;
}

function calcularRankingSemanal(users: any[] = [], pedidos: any[] = [], pagos: any[] = []) {
  const inicioSemana = getInicioSemanaArgentina();

  return users
    .filter((u) => u.role !== 'admin')
    .map((user) => {
      const entregadosSemana = pedidos.filter((p) => {
        if (p.usuario_email !== user.email || p.estado !== 'entregado') return false;
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
      };
    })
    .sort((a, b) => {
      if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
      if (b.generado !== a.generado) return b.generado - a.generado;
      return b.productosVendidos - a.productosVendidos;
    })
    .map((item, index) => ({ ...item, puesto: index + 1 }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch(() => null);

    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const semanaKey = getSemanaKey();
    const referencia = `Premio torneo semanal ${semanaKey}`;

    const pagos = await base44.asServiceRole.entities.Pago.list();
    const premioYaAplicado = pagos.some((p) => p.referencia === referencia);
    if (premioYaAplicado) {
      return Response.json({ ok: true, skipped: true, reason: 'premio ya aplicado', semanaKey });
    }

    const [users, pedidos] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Pedido.list(),
    ]);

    const ranking = calcularRankingSemanal(users, pedidos, pagos);
    const ganador = ranking[0];

    if (!ganador) {
      return Response.json({ ok: true, skipped: true, reason: 'sin usuarios', semanaKey });
    }

    if (ganador.deuda > 0) {
      const monto = Math.min(PREMIO_DESCUENTO_DEUDA, ganador.deuda);
      const pago = await base44.asServiceRole.entities.Pago.create({
        usuario_email: ganador.email,
        usuario_nombre: ganador.nombre,
        fecha: new Date().toISOString(),
        monto,
        metodo: 'premio_torneo',
        referencia,
        observaciones: `Ganador torneo semanal: descuento de deuda por $${monto.toLocaleString('es-AR')}`,
        origen: 'sistema',
      });

      return Response.json({ ok: true, semanaKey, ganador, premio: { tipo: 'descuento_deuda', monto }, pago });
    }

    const pedido = await base44.asServiceRole.entities.Pedido.create({
      usuario_email: ganador.email,
      usuario_nombre: ganador.nombre,
      fecha: new Date().toISOString(),
      estado: 'entregado',
      tipo_pago: 'premio_torneo',
      cantidad: PREMIO_UNIDADES,
      valor_usado: 0,
      total: 0,
      observaciones: referencia,
    });

    return Response.json({ ok: true, semanaKey, ganador, premio: { tipo: 'unidades', unidades: PREMIO_UNIDADES }, pedido });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
