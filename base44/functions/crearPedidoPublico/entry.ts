import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token, cantidad, tipoPago, observaciones } = await req.json();

  if (!token || !cantidad || !tipoPago) {
    return Response.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const users = await base44.asServiceRole.entities.User.filter({ link_token: token });
  if (!users.length) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const user = users[0];
  const valor = tipoPago === 'contado' ? (user.valor_contado || 0) : (user.valor_cuenta || 0);
  const total = cantidad * valor;

  const pedido = await base44.asServiceRole.entities.Pedido.create({
    usuario_email: user.email,
    usuario_nombre: user.full_name,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
    tipo_pago: tipoPago,
    cantidad,
    valor_usado: valor,
    total,
    observaciones: observaciones || '',
  });

  // Notify admins
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Nuevo pedido de ${user.full_name || user.email}`,
        body: `Nuevo pedido registrado:\n\nUsuario: ${user.full_name || user.email}\nCantidad: ${cantidad}\nTipo: ${tipoPago === 'contado' ? 'Contado' : 'A Cuenta'}\nValor unitario: $${valor.toLocaleString()}\nTotal: $${total.toLocaleString()}${observaciones ? `\nObservaciones: ${observaciones}` : ''}`,
      });
    }
  } catch {}

  return Response.json({ pedido });
});