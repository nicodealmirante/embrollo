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