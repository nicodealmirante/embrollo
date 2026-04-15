import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { key, title, message } = await req.json();

    if (!key || !message) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const params = new URLSearchParams({ key, msg: message });
    if (title) params.set('title', title);

    const res = await fetch(`https://api.simplepush.io/send?${params.toString()}`);
    const text = await res.text();

    return Response.json({ ok: res.ok, response: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});