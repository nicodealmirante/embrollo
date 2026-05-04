import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [users, pedidos, pagos, configs] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Pedido.list(),
      base44.asServiceRole.entities.Pago.list(),
      base44.asServiceRole.entities.ConfigApp.list().catch(() => [])
    ]);

    return Response.json({ users, pedidos, pagos, configs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});