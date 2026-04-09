import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token, email } = await req.json();
  if (!token || !email) return Response.json({ error: 'Faltan datos' }, { status: 400 });

  const base44 = createClientFromRequest(req);

  // Verify pending link exists
  const enlaces = await base44.asServiceRole.entities.EnlacePendiente.filter({ token });
  if (!enlaces.length) return Response.json({ error: 'Enlace no válido' }, { status: 404 });

  // Find user by email
  const users = await base44.asServiceRole.entities.User.filter({ email });
  if (!users.length) return Response.json({ error: 'No existe una cuenta con ese email. Registrate primero.' }, { status: 404 });

  const user = users[0];

  // Assign token to user
  await base44.asServiceRole.entities.User.update(user.id, { link_token: token });

  // Delete pending link
  await base44.asServiceRole.entities.EnlacePendiente.delete(enlaces[0].id);

  return Response.json({ success: true });
});