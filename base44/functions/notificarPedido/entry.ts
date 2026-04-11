import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data } = await req.json();

  if (event?.type !== 'create') return Response.json({ ok: true });

  const pedido = data;
  if (!pedido) return Response.json({ ok: true });

  // Get admin users to notify
  const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

  for (const admin of admins) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: admin.email,
      subject: `🛒 Nuevo pedido de ${pedido.usuario_nombre || pedido.usuario_email}`,
      body: `
        <h2>Nuevo pedido recibido</h2>
        <p><strong>Cliente:</strong> ${pedido.usuario_nombre || pedido.usuario_email}</p>
        <p><strong>Cantidad:</strong> ${pedido.cantidad} unidades</p>
        ${pedido.observaciones ? `<p><strong>Observaciones:</strong> ${pedido.observaciones}</p>` : ''}
        <p><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleString('es-AR')}</p>
        <br/>
        <p>Ingresá al panel de administración para confirmar la entrega.</p>
      `,
    });
  }

  return Response.json({ ok: true });
});