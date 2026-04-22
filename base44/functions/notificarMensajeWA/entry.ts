import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_INSTANCE = "waInstance7107595736";
const GREEN_TOKEN = "f7a7c98f098b47098c5748a81613fd95bbb1d6231fe9429da1";
const GROUP_CHAT_ID = "120363410157216558@g.us";

async function sendGreenGroup(message) {
  await fetch(`${GREEN_API_URL}/${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: GROUP_CHAT_ID, message }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const mensaje = payload.data;

    if (!mensaje || mensaje.es_admin) return Response.json({ skipped: true });

    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    if (cfg.whatsapp_notif_mensaje === "false") {
      return Response.json({ skipped: true, reason: "disabled" });
    }

    const texto = `💬 Nuevo mensaje en Embrollo!\n👤 ${mensaje.usuario_nombre || mensaje.usuario_email}\n📧 ${mensaje.usuario_email}\n📝 ${mensaje.texto}`;

    const promises = [];

    if (cfg.whatsapp_telefono && WA_PHONE_ID && WA_TOKEN) {
      promises.push(fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: cfg.whatsapp_telefono, type: "text", text: { body: texto } }),
      }));
    }

    // Email a admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
    for (const admin of admins) {
      if (admin.email) {
        promises.push(base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: "💬 Nuevo mensaje - Embrollo",
          body: texto.replace(/\n/g, "<br>"),
        }));
      }
    }

    promises.push(sendGreenGroup(`${(admins[0]?.full_name || admins[0]?.email || "Admin")} NOTIFICACION`));

    await Promise.allSettled(promises);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});