import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const pedido = payload.data;

    if (!pedido) return Response.json({ skipped: true });

    const configs = await base44.asServiceRole.entities.ConfigApp.filter({});
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    if (cfg.whatsapp_notif_pedido === "false") {
      return Response.json({ skipped: true, reason: "disabled" });
    }

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
          subject: "📦 Nuevo pedido - Embrollo",
          body: texto.replace(/\n/g, "<br>"),
        }));
      }
    }

    await Promise.allSettled(promises);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});