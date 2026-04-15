import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const pedido = payload.data;

    if (!pedido) {
      return Response.json({ skipped: true });
    }

    // Obtener configuración
    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    if (cfg.whatsapp_notif_pedido === "false") {
      return Response.json({ skipped: "notifications disabled" });
    }

    const telefono = cfg.whatsapp_telefono;
    const apikey = cfg.whatsapp_apikey;

    if (!telefono || !apikey) {
      return Response.json({ skipped: "no config" });
    }

    const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Buenos_Aires" });
    const obs = pedido.observaciones ? `\n📝 Obs: ${pedido.observaciones}` : "";
    const texto = `📦 Nuevo pedido en Embrollo\n👤 Cliente: ${pedido.usuario_nombre || pedido.usuario_email}\n📧 Email: ${pedido.usuario_email}\n🔢 Cantidad: ${pedido.cantidad} unidades${obs}\n🕐 ${fecha}`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
    await fetch(url);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});