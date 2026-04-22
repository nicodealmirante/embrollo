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
    const pago = payload.data;

    if (!pago || pago.origen !== "usuario") return Response.json({ skipped: true });

    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    const ref = pago.referencia ? `\n🔖 Ref: ${pago.referencia}` : "";
    const obs = pago.observaciones ? `\n📝 ${pago.observaciones}` : "";
    const comp = pago.comprobante_url ? `\n🧾 Comprobante: ${pago.comprobante_url}` : "";
    const texto = `💰 Nuevo pago registrado en Embrollo!\n👤 ${pago.usuario_nombre || pago.usuario_email}\n📧 ${pago.usuario_email}\n💵 $${(pago.monto || 0).toLocaleString('es-AR')} (${pago.metodo})${ref}${obs}${comp}\n🔗 https://embrollo.me/admin`;

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
          subject: "💰 Nuevo pago pendiente - Embrollo",
          body: texto.replace(/\n/g, "<br>"),
        }));
      }
    }

    promises.push(sendGreenGroup(`${pago.usuario_nombre || pago.usuario_email} NOTIFICACION`));

    await Promise.allSettled(promises);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});