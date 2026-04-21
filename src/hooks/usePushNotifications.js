import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications(userEmail) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!userEmail || !supported) return;
    checkSubscription();
  }, [userEmail, supported]);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Verify it's registered in DB
        const tokens = await base44.entities.PushToken.filter({ usuario_email: userEmail, activo: true });
        const tokenStr = JSON.stringify(sub);
        setSubscribed(tokens.some(t => t.token_json === tokenStr));
      } else {
        setSubscribed(false);
      }
    } catch {
      setSubscribed(false);
    }
  }

  async function subscribe() {
    if (!supported || !userEmail) return;
    setLoading(true);
    try {
      // Register SW if not already
      let reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setLoading(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC || ""),
      });

      const tokenJson = JSON.stringify(sub);
      const dispositivo = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "móvil" : "escritorio";

      // Remove old tokens for this user+endpoint to avoid duplicates
      const existing = await base44.entities.PushToken.filter({ usuario_email: userEmail });
      await Promise.all(existing.map(t => base44.entities.PushToken.delete(t.id)));

      await base44.entities.PushToken.create({
        usuario_email: userEmail,
        token_json: tokenJson,
        activo: true,
        dispositivo,
      });

      setSubscribed(true);
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      const tokens = await base44.entities.PushToken.filter({ usuario_email: userEmail });
      await Promise.all(tokens.map(t => base44.entities.PushToken.delete(t.id)));

      setSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
    setLoading(false);
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}