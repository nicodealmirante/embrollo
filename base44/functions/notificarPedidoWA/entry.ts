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

    // Obtener config global del admin
    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    if (!cfg.whatsapp_telefono || !cfg.whatsapp_apikey || cfg.whatsapp_notif_pedido === "false") {
      return Response.json({ skipped: true, reason: "no config or disabled" });
    }

    // Obtener precio a cuenta del usuario para calcular total estimado
    let totalEstimado = null;
    if (pedido.usuario_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: pedido.usuario_email });
      if (users.length && users[0].valor_cuenta) {
        totalEstimado = pedido.cantidad * users[0].valor_cuenta;
      }
    }

    const enlaceAdmin = `https://embrollo.me/admin`;

    const obs = pedido.observaciones ? `\n📝 Obs: ${pedido.observaciones}` : "";
    const totalLine = totalEstimado !== null ? `\n💰 Total estimado: $${totalEstimado.toLocaleString('es-AR')}` : "";
    const texto = `📦 Nuevo pedido en Embrollo!\n👤 Cliente: ${pedido.usuario_nombre || pedido.usuario_email}\n📧 ${pedido.usuario_email}\n🔢 Cantidad: ${pedido.cantidad} unidades${totalLine}${obs}\n🔗 ${enlaceAdmin}`;

    await enviarWA(cfg.whatsapp_telefono, cfg.whatsapp_apikey, texto);

    // SimplePush
    if (cfg.simplepush_key) {
      const spParams = new URLSearchParams({ key: cfg.simplepush_key, title: '📦 Nuevo pedido', msg: texto });
      await fetch(`https://api.simplepush.io/send?${spParams.toString()}`);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});