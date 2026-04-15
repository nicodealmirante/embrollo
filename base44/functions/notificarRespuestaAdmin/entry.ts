import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const mensaje = payload.data;

    // Solo notificar mensajes del admin hacia el usuario
    if (!mensaje || !mensaje.es_admin || !mensaje.usuario_email) {
      return Response.json({ skipped: true });
    }

    // Buscar la simplepush_key del usuario
    const users = await base44.asServiceRole.entities.User.filter({ email: mensaje.usuario_email });
    const user = users[0];
    if (!user?.simplepush_key) {
      return Response.json({ skipped: true, reason: 'usuario sin simplepush_key' });
    }

    const texto = `${mensaje.texto}`;
    const spParams = new URLSearchParams({ key: user.simplepush_key, title: '💬 Embrollo', msg: texto });
    await fetch(`https://api.simplepush.io/send?${spParams.toString()}`);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});