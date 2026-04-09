import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token } = await req.json();

  if (!token) {
    return Response.json({ error: 'Token requerido' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const users = await base44.asServiceRole.entities.User.filter({ link_token: token });
  if (!users.length) {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }

  const user = users[0];
  const [pedidos, pagos] = await Promise.all([
    base44.asServiceRole.entities.Pedido.filter({ usuario_email: user.email }, '-created_date'),
    base44.asServiceRole.entities.Pago.filter({ usuario_email: user.email }),
  ]);

  return Response.json({ user, pedidos, pagos });
});