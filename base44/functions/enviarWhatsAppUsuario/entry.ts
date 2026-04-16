import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

export async function enviarWhatsAppUsuario(telefono, templateName, languageCode = "es_AR") {
  const res = await fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "template",
      template: { name: templateName, language: { code: languageCode } },
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { telefono, template_name, language_code } = await req.json();
    if (!telefono || !template_name) return Response.json({ error: "Faltan parámetros" }, { status: 400 });
    const result = await enviarWhatsAppUsuario(telefono, template_name, language_code || "es_AR");
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});