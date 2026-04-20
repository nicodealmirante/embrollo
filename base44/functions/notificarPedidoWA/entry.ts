// v2
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TELEGRAM_CHAT_ID = "7448007856";
const TELEGRAM_API = `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}`;
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const ADMIN_WA_NUMBER = "+5491159132301";

async function enviarTelegram(texto) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto }),
  });
}

async function enviarWhatsAppTexto(telefono, texto) {
  const res = await fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefono,
      type: "text",
      text: { preview_url: false, body: texto },
    }),
  });
  const data = await res.json();
  console.log(`WA [${telefono}] status=${res.status}`, JSON.stringify(data));
  return data;
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

    // WhatsApp al admin (número fijo + número configurado si es distinto)
    if (WA_PHONE_ID && WA_TOKEN) {
      promises.push(enviarWhatsAppTexto(ADMIN_WA_NUMBER, texto));
      if (cfg.whatsapp_telefono && cfg.whatsapp_telefono !== ADMIN_WA_NUMBER) {
        promises.push(enviarWhatsAppTexto(cfg.whatsapp_telefono, texto));
      }
    }

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