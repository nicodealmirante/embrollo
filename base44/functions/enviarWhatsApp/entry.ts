import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { telefono, apikey, mensaje } = await req.json();

    if (!telefono || !apikey || !mensaje) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apikey)}`;

    const res = await fetch(url);
    const text = await res.text();

    return Response.json({ ok: res.ok, status: res.status, response: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});