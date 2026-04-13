import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Send, ChevronDown, ChevronUp, X } from "lucide-react";
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

  useEffect(() => {
    if (!user?.email) return;
    loadMensajes();
    const unsub = base44.entities.Mensaje.subscribe((event) => {
      if (event.data?.usuario_email === user.email) {
        loadMensajes();
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (open) {
      marcarLeidos();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open, mensajes]);

  async function loadMensajes() {
    const data = await base44.entities.Mensaje.filter({ usuario_email: user.email }, "created_date");
    setMensajes(data);
    const nl = data.filter(m => m.es_admin && !m.leido).length;
    setNoLeidos(nl);
  }

  async function marcarLeidos() {
    const sinLeer = mensajes.filter(m => m.es_admin && !m.leido);
    for (const m of sinLeer) {
      await base44.entities.Mensaje.update(m.id, { leido: true });
    }
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

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: "420px" }}>
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <p className="font-semibold text-sm">Chat con el administrador</p>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: "240px", maxHeight: "280px" }}>
            {mensajes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Enviá un mensaje al administrador</p>
            )}
            {mensajes.map((m) => (
              <div key={m.id} className={`flex ${m.es_admin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${m.es_admin ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                  <p>{m.texto}</p>
                  <p className={`text-[10px] mt-1 ${m.es_admin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                    {moment(m.created_date).format("HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-border flex gap-2">
            <Input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && enviar()}
              placeholder="Escribí un mensaje..."
              className="text-sm h-8"
            />
            <Button size="sm" onClick={enviar} disabled={enviando || !texto.trim()} className="h-8 px-3">
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="relative bg-primary text-primary-foreground rounded-full p-3.5 shadow-lg hover:bg-primary/90 transition-all"
      >
        <MessageCircle className="w-5 h-5" />
        {noLeidos > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {noLeidos}
          </span>
        )}
      </button>
    </div>
  );
}