import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function enviarWA(telefono, apikey, texto) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  await fetch(url);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const mensaje = payload.data;

    if (!mensaje) return Response.json({ skipped: true });

    const promises = [];

    if (mensaje.es_admin) {
      // Admin le escribió al usuario → notificar al usuario
      const users = await base44.asServiceRole.entities.User.filter({ email: mensaje.usuario_email });
      const user = users[0];
      if (user?.whatsapp_telefono && user?.whatsapp_apikey) {
        const texto = `Nuevo mensaje en Embrollo: ${mensaje.texto}`;
        promises.push(enviarWA(user.whatsapp_telefono, user.whatsapp_apikey, texto));
      }
    } else {
      // Usuario le escribió al admin → notificar al admin
      const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
      const cfg = {};
      configs.forEach(c => { cfg[c.clave] = c.valor; });
      if (cfg.whatsapp_telefono && cfg.whatsapp_apikey && cfg.whatsapp_notif_mensaje !== "false") {
        const texto = `Nuevo mensaje en Embrollo! Cliente: ${mensaje.usuario_nombre || mensaje.usuario_email} dice: ${mensaje.texto}`;
        promises.push(enviarWA(cfg.whatsapp_telefono, cfg.whatsapp_apikey, texto));
      }
    }

    await Promise.all(promises);
    return Response.json({ ok: true, notificados: promises.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});