import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import moment from "moment";

export default function ChatUsuario({ user }) {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);
  const bottomRef = useRef(null);
  const openRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    if (!user?.email) return;
    loadMensajes();
    const unsub = base44.entities.Mensaje.subscribe((event) => {
      if (event.data?.usuario_email === user.email) loadMensajes();
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (open) {
      marcarLeidos();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [mensajes]);

  async function loadMensajes() {
    const data = await base44.entities.Mensaje.filter({ usuario_email: user.email }, "created_date");
    setMensajes(data);
    const sinLeer = data.filter(m => m.es_admin && !m.leido);
    setNoLeidos(sinLeer.length);
    if (openRef.current && sinLeer.length > 0) {
      await Promise.all(sinLeer.map(m => base44.entities.Mensaje.update(m.id, { leido: true })));
      setNoLeidos(0);
    }
  }

  async function marcarLeidos() {
    const sinLeer = mensajes.filter(m => m.es_admin && !m.leido);
    if (sinLeer.length === 0) return;
    await Promise.all(sinLeer.map(m => base44.entities.Mensaje.update(m.id, { leido: true })));
    setNoLeidos(0);
  }

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    await base44.entities.Mensaje.create({
      usuario_email: user.email,
      usuario_nombre: user.full_name || user.email,
      texto: texto.trim(),
      es_admin: false,
      leido: false,
    });
    setTexto("");
    setEnviando(false);
    loadMensajes();
  }

  const FAB_SIZE = 52; // px
  const MARGIN = 16;   // px from edges

  return (
    <>
      {/* Ventana de chat — posicionada sobre el FAB */}
      {open && (
        <div
          className="fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            bottom: MARGIN + FAB_SIZE + 8,
            right: MARGIN,
            width: `min(320px, calc(100vw - ${MARGIN * 2}px))`,
            height: `min(420px, calc(100vh - ${MARGIN * 2 + FAB_SIZE + 16}px))`,
          }}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <p className="font-semibold text-sm">Chat con el administrador</p>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {mensajes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                ¡Hola! Enviá un mensaje y el administrador te responderá pronto.
              </p>
            )}
            {mensajes.map((m) => (
              <div key={m.id} className={`flex ${m.es_admin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  m.es_admin
                    ? "bg-muted text-foreground rounded-bl-sm"
                    : "bg-primary text-primary-foreground rounded-br-sm"
                }`}>
                  <p>{m.texto}</p>
                  <p className={`text-[10px] mt-1 ${m.es_admin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                    {moment(m.created_date).format("HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border flex gap-2 shrink-0">
            <Input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
              placeholder="Escribí un mensaje..."
              className="text-sm h-9"
            />
            <Button size="sm" onClick={enviar} disabled={enviando || !texto.trim()} className="h-9 px-3">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* FAB — siempre visible en esquina inferior derecha */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed z-50 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center"
        style={{ bottom: MARGIN, right: MARGIN, width: FAB_SIZE, height: FAB_SIZE }}
      >
        <MessageCircle className="w-5 h-5" />
        {noLeidos > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {noLeidos}
          </span>
        )}
      </button>
    </>
  );
}