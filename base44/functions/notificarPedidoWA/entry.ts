import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function enviarWA(telefono, apikey, texto) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  await fetch(url);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const pedido = payload.data;

    if (!pedido) return Response.json({ skipped: true });

    const obs = pedido.observaciones ? ` - ${pedido.observaciones}` : "";
    const textoUsuario = `Pedido recibido en Embrollo! Cantidad: ${pedido.cantidad} unidades${obs}`;
    const textoAdmin = `Nuevo pedido en Embrollo! Cliente: ${pedido.usuario_nombre || pedido.usuario_email} - Cantidad: ${pedido.cantidad} unidades${obs}`;

    const promises = [];

    // Notificar al usuario
    const users = await base44.asServiceRole.entities.User.filter({ email: pedido.usuario_email });
    const user = users[0];
    if (user?.whatsapp_telefono && user?.whatsapp_apikey) {
      promises.push(enviarWA(user.whatsapp_telefono, user.whatsapp_apikey, textoUsuario));
    }

    // Notificar al admin (config global)
    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });
    if (cfg.whatsapp_telefono && cfg.whatsapp_apikey && cfg.whatsapp_notif_pedido !== "false") {
      promises.push(enviarWA(cfg.whatsapp_telefono, cfg.whatsapp_apikey, textoAdmin));
    }

    await Promise.all(promises);
    return Response.json({ ok: true, notificados: promises.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});