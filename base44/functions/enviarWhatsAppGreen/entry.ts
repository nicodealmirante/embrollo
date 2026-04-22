import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GREEN_API_URL = "https://7107.api.greenapi.com";
const GREEN_INSTANCE = "waInstance7107595736";
const GREEN_TOKEN = "f7a7c98f098b47098c5748a81613fd95bbb1d6231fe9429da1";

const GROUP_CHAT_ID = "120363410157216558@g.us";

async function sendWhatsApp(message) {
  const url = `${GREEN_API_URL}/${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: GROUP_CHAT_ID, message }),
  });
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message) {
      return Response.json({ error: "message es requerido" }, { status: 400 });
    }

    const result = await sendWhatsApp(message);
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});