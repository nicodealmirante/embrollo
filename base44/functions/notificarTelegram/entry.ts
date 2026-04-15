import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TELEGRAM_API = `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}`;

export async function enviarTelegram(chatId, texto) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { chat_id, texto } = await req.json();
    if (!chat_id || !texto) return Response.json({ error: "Faltan parámetros" }, { status: 400 });
    await enviarTelegram(chat_id, texto);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});