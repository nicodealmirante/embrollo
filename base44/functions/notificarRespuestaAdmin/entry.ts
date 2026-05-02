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

    if (!mensaje || !mensaje.es_admin || !mensaje.usuario_email) {
      return Response.json({ skipped: true });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: mensaje.usuario_email });
    const user = users[0];
    if (!user) return Response.json({ skipped: true, reason: 'usuario no encontrado' });

    const promises = [];

    if (user.telefono && WA_PHONE_ID && WA_TOKEN) {
      promises.push(fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: user.telefono,
          type: "text",
          text: { body: `💬 Embrollo — El administrador te respondió:\n\n${mensaje.texto}` },
        }),
      }));
    }

    if (user.email) {
      promises.push(base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: "💬 Tenés una respuesta en Embrollo",
        body: `El administrador te respondió:<br><br><strong>${mensaje.texto}</strong>`,
      }));

      promises.push(enviarPush(
        base44,
        user.email,
        "💬 Respuesta del admin",
        "Tenés una respuesta nueva en Embrollo",
        "/"
      ));
    }

    const results = await Promise.allSettled(promises);
    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
