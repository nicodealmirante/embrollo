import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_INSTANCE = "waInstance7107595736";
const GREEN_TOKEN = "f7a7c98f098b47098c5748a81613fd95bbb1d6231fe9429da1";

async function sendWhatsApp(chatId, message) {
  const url = `${GREEN_API_URL}/${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { chatId, message } = await req.json();
    if (!chatId || !message) {
      return Response.json({ error: "chatId y message son requeridos" }, { status: 400 });
    }

    const result = await sendWhatsApp(chatId, message);
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});