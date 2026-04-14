import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@embrollo.app";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { usuario_email, title, body, url } = await req.json();

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

    // Get all active tokens for this user (or all users if no email specified)
    const query = { activo: true };
    if (usuario_email) query.usuario_email = usuario_email;

    const tokens = await base44.asServiceRole.entities.PushToken.filter(query);

    const payload = JSON.stringify({ title, body, url: url || '/' });

    const results = await Promise.allSettled(
      tokens.map(async (t) => {
        const subscription = JSON.parse(t.token_json);
        await webpush.sendNotification(subscription, payload);
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return Response.json({ sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});