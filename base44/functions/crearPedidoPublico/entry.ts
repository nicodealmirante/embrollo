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
    const isActivo = u?.contador_estado === "activo" && u?.contador_fin && new Date(u.contador_fin) > new Date();
    const v = isActivo ? (u?.valor_contador_activo || 0) : (u?.valor_contado || u?.valor_cuenta || 0);
    valorContado = v;
    valorCuenta = v;
  } else {
    if (!token) return Response.json({ error: 'Faltan datos' }, { status: 400 });
    // Flujo por token público
    const users = await base44.asServiceRole.entities.User.filter({ link_token: token });
    if (users.length) {
      const u = users[0];
      email = u.email;
      nombre = u.nombre_visible || u.link_titulo || u.full_name || u.email;
      const isActivo = u.contador_estado === "activo" && u.contador_fin && new Date(u.contador_fin) > new Date();
      const v = isActivo ? (u.valor_contador_activo || 0) : (u.valor_contado || u.valor_cuenta || 0);
      valorContado = v;
      valorCuenta = v;
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
        const pausadoManual = getCfg("contador_pausado_manual") === "true";

        if (!pausadoManual) {
          const userObj = usersMatched[0];
          const ahora = new Date();
          
          let finActual = userObj.contador_fin ? new Date(userObj.contador_fin) : ahora;
          if (finActual < ahora) finActual = ahora;

          let nuevoFin = new Date(finActual.getTime() + cantidad * 60 * 60000);
          const maxFin = new Date(ahora.getTime() + 24 * 60 * 60000);

          if (nuevoFin > maxFin) {
            nuevoFin = maxFin;
          }

          await base44.asServiceRole.entities.User.update(userObj.id, {
            contador_inicio: userObj.contador_inicio || ahora.toISOString(),
            contador_fin: nuevoFin.toISOString(),
            contador_estado: "activo"
          });
        }
      }
    }
  } catch (e) {
    console.error("Error contador:", e);
  }

  return Response.json({ pedido });
});