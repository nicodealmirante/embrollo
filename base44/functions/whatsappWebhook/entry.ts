import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "embrollo_verify_123";

async function sendWhatsAppMessage(to, text) {
  await fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

Deno.serve(async (req) => {
  // Verificación del webhook (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // Recepción de mensajes (POST)
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return Response.json({ ok: true });
    }

    const from = message.from; // número de teléfono del usuario
    const userText = message.text?.body;

    // Buscar usuario por teléfono en la app
    const allUsers = await base44.asServiceRole.entities.User.list();
    const matchedUser = allUsers.find(u => u.telefono && u.telefono.replace(/\D/g, "").endsWith(from.slice(-8)));

    let contextStr = "";
    if (matchedUser) {
      const [pedidos, pagos] = await Promise.all([
        base44.asServiceRole.entities.Pedido.filter({ usuario_email: matchedUser.email }),
        base44.asServiceRole.entities.Pago.filter({ usuario_email: matchedUser.email }),
      ]);

      const totalPedido = pedidos.filter(p => p.estado !== "cancelado").reduce((s, p) => s + (p.total || 0), 0);
      const totalPagado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
      const saldo = totalPedido - totalPagado;

      const ultimosPedidos = pedidos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5)
        .map(p => `- ${p.cantidad} unidades el ${new Date(p.fecha).toLocaleDateString("es-AR")} (${p.estado}, $${p.total || 0})`)
        .join("\n");

      contextStr = `
El usuario que escribe es: ${matchedUser.full_name || matchedUser.email}
Saldo actual: $${saldo.toLocaleString("es-AR")} ${saldo > 0 ? "(debe)" : "(a favor o al día)"}
Últimos pedidos:
${ultimosPedidos || "Sin pedidos recientes"}
Pagos realizados: $${totalPagado.toLocaleString("es-AR")}
`.trim();
    } else {
      contextStr = "El usuario no está registrado en el sistema. Podés invitarlo a registrarse.";
    }

    // Crear conversación con el agente Luna y enviar mensaje
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: "Luna",
      metadata: { whatsapp_from: from, name: matchedUser?.full_name || from },
    });

    const systemContext = `Sos Luna, asistente de soporte de Embrollo. Respondé siempre en español, de forma amable y concisa.\n\nDatos del cliente:\n${contextStr}`;

    const response = await base44.asServiceRole.agents.addMessage(conversation, {
      role: "user",
      content: `[CONTEXTO DEL CLIENTE]\n${systemContext}\n\n[MENSAJE DEL CLIENTE]\n${userText}`,
    });

    // Esperar respuesta del agente (polling)
    let agentReply = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const updated = await base44.asServiceRole.agents.getConversation(conversation.id);
      const lastMsg = updated.messages?.[updated.messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg?.content) {
        agentReply = lastMsg.content;
        break;
      }
    }

    if (agentReply) {
      await sendWhatsAppMessage(from, agentReply);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});