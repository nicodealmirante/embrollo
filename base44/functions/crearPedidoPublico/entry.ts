import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token, cantidad, observaciones } = await req.json();
  if (!token || !cantidad) return Response.json({ error: 'Faltan datos' }, { status: 400 });

  const base44 = createClientFromRequest(req);

  // Try registered user first
  let email, nombre, valorContado, valorCuenta;
  const users = await base44.asServiceRole.entities.User.filter({ link_token: token });
  if (users.length) {
    const u = users[0];
    email = u.email;
    nombre = u.full_name;
    valorContado = u.valor_contado || 0;
    valorCuenta = u.valor_cuenta || 0;
  } else {
    // Try claimed EnlacePendiente
    const enlaces = await base44.asServiceRole.entities.EnlacePendiente.filter({ token });
    if (!enlaces.length || !enlaces[0].email) {
      return Response.json({ error: 'Enlace no válido o no reclamado' }, { status: 404 });
    }
    const e = enlaces[0];
    email = e.email;
    nombre = e.nombre || e.email;
    valorContado = e.valor_contado || 0;
    valorCuenta = e.valor_cuenta || 0;
  }

  const pedido = await base44.asServiceRole.entities.Pedido.create({
    usuario_email: email,
    usuario_nombre: nombre,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
    tipo_pago: 'cuenta',
    cantidad,
    valor_usado: 0,
    total: 0,
    observaciones: observaciones || '',
  });

  return Response.json({ pedido });
});