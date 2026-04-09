import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token, email, nombre } = await req.json();
  if (!token || !email) return Response.json({ error: 'Faltan datos' }, { status: 400 });

  const base44 = createClientFromRequest(req);

  const enlaces = await base44.asServiceRole.entities.EnlacePendiente.filter({ token });
  if (!enlaces.length) return Response.json({ error: 'Enlace no válido' }, { status: 404 });

  const enlace = enlaces[0];

  // Already claimed
  if (enlace.email) return Response.json({ error: 'Este enlace ya fue reclamado' }, { status: 409 });

  // Save identification on the pending link (no User account needed)
  await base44.asServiceRole.entities.EnlacePendiente.update(enlace.id, {
    email: email.toLowerCase().trim(),
    nombre: nombre || email,
  });

  return Response.json({ success: true });
});