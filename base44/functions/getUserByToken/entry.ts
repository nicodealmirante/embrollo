import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token } = await req.json();
  if (!token) return Response.json({ error: 'Token requerido' }, { status: 400 });

  const base44 = createClientFromRequest(req);

  // First try: registered User with link_token
  const users = await base44.asServiceRole.entities.User.filter({ link_token: token });
  if (users.length) {
    const user = users[0];
    const [pedidos, pagos] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ usuario_email: user.email }, '-created_date'),
      base44.asServiceRole.entities.Pago.filter({ usuario_email: user.email }),
    ]);
    return Response.json({ user, pedidos, pagos });
  }

  // Second try: claimed EnlacePendiente (identified but no registered account)
  const enlaces = await base44.asServiceRole.entities.EnlacePendiente.filter({ token });
  if (enlaces.length && enlaces[0].email) {
    const enlace = enlaces[0];
    const fakeUser = {
      email: enlace.email,
      nombre_visible: enlace.nombre || enlace.email,
      full_name: enlace.nombre || enlace.email,
      valor_contado: enlace.valor_contado || 0,
      valor_cuenta: enlace.valor_cuenta || 0,
      link_titulo: enlace.nombre || enlace.email,
      link_token: token,
    };
    const [pedidos, pagos] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ usuario_email: enlace.email }, '-created_date'),
      base44.asServiceRole.entities.Pago.filter({ usuario_email: enlace.email }),
    ]);
    return Response.json({ user: fakeUser, pedidos, pagos });
  }

  return Response.json({ error: 'No encontrado' }, { status: 404 });
});