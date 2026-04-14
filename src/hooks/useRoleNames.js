import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cache global para evitar múltiples fetches
let cache = null;
let listeners = [];

function notify() {
  listeners.forEach(fn => fn(cache));
}

async function loadConfig() {
  const configs = await base44.entities.ConfigApp.list();
  const adminEntry = configs.find(c => c.clave === "nombre_rol_admin");
  const userEntry = configs.find(c => c.clave === "nombre_rol_usuario");
  cache = {
    adminName: adminEntry?.valor || "Admin",
    userName: userEntry?.valor || "Usuario",
  };
  notify();
  return cache;
}

export function useRoleNames() {
  const [names, setNames] = useState(cache || { adminName: "Admin", userName: "Usuario" });

  useEffect(() => {
    const listener = (val) => setNames({ ...val });
    listeners.push(listener);

    if (!cache) {
      loadConfig();
    }

    return () => {
      listeners = listeners.filter(fn => fn !== listener);
    };
  }, []);

  return names;
}

export async function saveRoleNames(adminName, userName) {
  const configs = await base44.entities.ConfigApp.list();

  const adminEntry = configs.find(c => c.clave === "nombre_rol_admin");
  const userEntry = configs.find(c => c.clave === "nombre_rol_usuario");

  if (adminEntry) {
    await base44.entities.ConfigApp.update(adminEntry.id, { valor: adminName });
  } else {
    await base44.entities.ConfigApp.create({ clave: "nombre_rol_admin", valor: adminName });
  }

  if (userEntry) {
    await base44.entities.ConfigApp.update(userEntry.id, { valor: userName });
  } else {
    await base44.entities.ConfigApp.create({ clave: "nombre_rol_usuario", valor: userName });
  }

  cache = { adminName, userName };
  notify();
}

// Invalidar caché para forzar recarga
export function invalidateRoleCache() {
  cache = null;
}