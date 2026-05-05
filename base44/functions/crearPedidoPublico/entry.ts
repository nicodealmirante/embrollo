import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { token, useEmail, cantidad, observaciones } = await req.json();

  if (!cantidad) return Response.json({ error: 'Faltan datos' }, { status: 400 });

  let email, nombre, valorContado, valorCuenta;

  if (useEmail) {
    // Usuario autenticado: obtener datos desde su sesión
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'No autenticado' }, { status: 401 });
    email = me.email;
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const u = users[0];
    nombre = u?.nombre_visible || u?.link_titulo || u?.full_name || me.full_name || email;
    valorContado = u?.valor_contado || 0;
    valorCuenta = u?.valor_cuenta || 0;
  } else {
    if (!token) return Response.json({ error: 'Faltan datos' }, { status: 400 });
    // Flujo por token público
    const users = await base44.asServiceRole.entities.User.filter({ link_token: token });
    if (users.length) {
      const u = users[0];
      email = u.email;
      nombre = u.nombre_visible || u.link_titulo || u.full_name || u.email;
      valorContado = u.valor_contado || 0;
      valorCuenta = u.valor_cuenta || 0;
    } else {
      const enlaces = await base44.asServiceRole.entities.EnlacePendiente.filter({ token });
      if (!enlaces.length || !enlaces[0].email) {
        return Response.json({ error: 'Enlace no válido o no reclamado' }, { status: 404 });
      }
      const e = enlaces[0];
      email = e.email;
      nombre = e.nombre || e.email;
      valorContado = e.valor_contado || 0;
      valorCuenta = e.valor_cuenta || 0;
    }
  }

  const pedido = await base44.asServiceRole.entities.Pedido.create({
    usuario_email: email,
    usuario_nombre: nombre,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
    tipo_pago: 'cuenta',
    cantidad,
    valor_usado: 0,
    total: 0,
    observaciones: observaciones || '',
  });

  // Lógica de reseteo del contador
  try {
    const cfgs = await base44.asServiceRole.entities.ConfigApp.list();
    const getCfg = (k) => cfgs.find(c => c.clave === k)?.valor;
    if (getCfg("contador_activo") === "true") {
      const usersMatched = await base44.asServiceRole.entities.User.filter({ email });
      if (usersMatched.length > 0) {
        const durMin = parseFloat(getCfg("contador_duracion_minutos") || 60);
        const pausadoManual = getCfg("contador_pausado_manual") === "true";

        let estado = "activo";
        if (pausadoManual) estado = "pausado_manual";

        const ahora = new Date();
        const fin = new Date(ahora.getTime() + durMin * 60000);

        await base44.asServiceRole.entities.User.update(usersMatched[0].id, {
          contador_inicio: ahora.toISOString(),
          contador_fin: fin.toISOString(),
          contador_estado: estado
        });
      }
    }
  } catch (e) {
    console.error("Error contador:", e);
  }

  return Response.json({ pedido });
});