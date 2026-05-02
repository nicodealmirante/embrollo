import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // WhatsApp al usuario
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

    // Email al usuario
    if (user.email) {
      promises.push(base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: "💬 Tenés una respuesta en Embrollo",
        body: `El administrador te respondió:<br><br><strong>${mensaje.texto}</strong>`,
      }));
    }

    await Promise.allSettled(promises);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});