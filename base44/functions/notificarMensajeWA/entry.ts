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

    if (!mensaje || mensaje.es_admin) return Response.json({ skipped: true });

    // Obtener config global del admin
    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    if (!cfg.whatsapp_telefono || !cfg.whatsapp_apikey || cfg.whatsapp_notif_mensaje === "false") {
      return Response.json({ skipped: true, reason: "no config or disabled" });
    }

    const texto = `💬 Nuevo mensaje en Embrollo!\n👤 Cliente: ${mensaje.usuario_nombre || mensaje.usuario_email}\n📧 ${mensaje.usuario_email}\n📝 ${mensaje.texto}`;

    // Enviar en paralelo, sin bloquear
    const promises = [enviarWA(cfg.whatsapp_telefono, cfg.whatsapp_apikey, texto)];
    if (cfg.simplepush_key) {
      const spParams = new URLSearchParams({ key: cfg.simplepush_key, title: '💬 Nuevo mensaje', msg: texto });
      promises.push(fetch(`https://api.simplepush.io/send?${spParams.toString()}`));
    }
    await Promise.allSettled(promises);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});