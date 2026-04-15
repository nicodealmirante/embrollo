import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TELEGRAM_CHAT_ID = "7448007856";
const TELEGRAM_API = `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}`;

async function enviarTelegram(texto) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto }),
  });
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

    if (cfg.whatsapp_notif_pedido === "false") {
      return Response.json({ skipped: true, reason: "disabled" });
    }

    // Obtener precio a cuenta del usuario para calcular total estimado
    let totalEstimado = null;
    if (pedido.usuario_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: pedido.usuario_email });
      if (users.length && users[0].valor_cuenta) {
        totalEstimado = pedido.cantidad * users[0].valor_cuenta;
      }
    }

    const obs = pedido.observaciones ? `\n📝 Obs: ${pedido.observaciones}` : "";
    const totalLine = totalEstimado !== null ? `\n💰 Total estimado: $${totalEstimado.toLocaleString('es-AR')}` : "";
    const texto = `📦 Nuevo pedido en Embrollo!\n👤 ${pedido.usuario_nombre || pedido.usuario_email}\n📧 ${pedido.usuario_email}\n🔢 Cantidad: ${pedido.cantidad} unidades${totalLine}${obs}\n🔗 https://embrollo.me/admin`;

    const promises = [enviarTelegram(texto)];
    if (cfg.simplepush_key) {
      const spParams = new URLSearchParams({ key: cfg.simplepush_key, title: '📦 Nuevo pedido', msg: texto });
      promises.push(fetch(`https://api.simplepush.io/send?${spParams.toString()}`));
    }
    await Promise.allSettled(promises);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});