import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@embrollo.app";

async function enviarPush(base44, usuarioEmail: string | null, title: string, body: string, url = "/admin") {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { skipped: true, reason: "VAPID keys not configured" };

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

  const query: Record<string, unknown> = { activo: true };
  if (usuarioEmail) query.usuario_email = usuarioEmail;

  const tokens = await base44.asServiceRole.entities.PushToken.filter(query);
  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    tokens.map(async (t) => {
      const subscription = JSON.parse(t.token_json);
      await webpush.sendNotification(subscription, payload);
    })
  );

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

async function enviarPushAdmins(base44, title: string, body: string, url = "/admin") {
  const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
  const results = await Promise.allSettled(
    admins
      .filter((admin) => admin.email)
      .map((admin) => enviarPush(base44, admin.email, title, body, url))
  );

  return {
    admins: admins.length,
    ok: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}


const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

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

    promises.push(enviarPushAdmins(
      base44,
      "💬 Nuevo mensaje",
      `${mensaje.usuario_nombre || mensaje.usuario_email} escribió en Embrollo`,
      "/admin"
    ));

    const results = await Promise.allSettled(promises);
    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
