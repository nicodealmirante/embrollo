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
  await fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "text",
      text: { body: texto },
    }),
  });
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

    if (cfg.whatsapp_notif_mensaje === "false") {
      return Response.json({ skipped: true, reason: "disabled" });
    }

    const texto = `💬 Nuevo mensaje en Embrollo!\n👤 ${mensaje.usuario_nombre || mensaje.usuario_email}\n📧 ${mensaje.usuario_email}\n📝 ${mensaje.texto}`;

    const promises = [enviarTelegram(texto)];

    // WhatsApp al admin (número fijo + número configurado si es distinto)
    if (WA_PHONE_ID && WA_TOKEN) {
      promises.push(enviarWhatsAppTexto(ADMIN_WA_NUMBER, texto));
      if (cfg.whatsapp_telefono && cfg.whatsapp_telefono !== ADMIN_WA_NUMBER) {
        promises.push(enviarWhatsAppTexto(cfg.whatsapp_telefono, texto));
      }
    }

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