import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const { token } = await req.json();
  if (!token) return Response.json({ error: 'Token requerido' }, { status: 400 });

  const base44 = createClientFromRequest(req);
  const enlaces = await base44.asServiceRole.entities.EnlacePendiente.filter({ token });

  if (!enlaces.length) return Response.json({ found: false });
  return Response.json({ found: true });
});