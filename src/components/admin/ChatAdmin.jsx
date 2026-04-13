import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import moment from "moment";

export default function ChatAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [noLeidos, setNoLeidos] = useState({});
  const bottomRef = useRef(null);
  const seleccionadoRef = useRef(null);

  // Keep ref in sync with state to avoid stale closures in subscriptions
  useEffect(() => {
    seleccionadoRef.current = seleccionado;
  }, [seleccionado]);

  useEffect(() => {
    loadUsuarios();
    const unsub = base44.entities.Mensaje.subscribe(() => {
      loadUsuarios();
      if (seleccionadoRef.current) loadMensajes(seleccionadoRef.current);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (seleccionado) loadMensajes(seleccionado);
  }, [seleccionado]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [mensajes]);

  async function loadUsuarios() {
    const todos = await base44.entities.Mensaje.list("-created_date");
    // Group by email preserving unique emails in order
    const emailsUnicos = [...new Set(todos.map(m => m.usuario_email))];
    const nl = {};
    const lista = emailsUnicos.map(email => {
      const msgs = todos.filter(m => m.usuario_email === email);
      nl[email] = msgs.filter(m => !m.es_admin && !m.leido).length;
      // Get nombre from a user message (not admin)
      const userMsg = msgs.find(m => !m.es_admin);
      return {
        email,
        nombre: userMsg?.usuario_nombre || msgs[0]?.usuario_nombre || email,
        ultimoMensaje: msgs[0]?.texto || "",
        fecha: msgs[0]?.created_date,
      };
    });
    setNoLeidos(nl);
    setUsuarios(lista);
  }

  async function loadMensajes(email) {
    const data = await base44.entities.Mensaje.filter({ usuario_email: email }, "created_date");
    setMensajes(data);
    // Mark user messages as read
    const sinLeer = data.filter(m => !m.es_admin && !m.leido);
    await Promise.all(sinLeer.map(m => base44.entities.Mensaje.update(m.id, { leido: true })));
    if (sinLeer.length > 0) {
      setNoLeidos(prev => ({ ...prev, [email]: 0 }));
    }
  }

  async function enviar() {
    if (!texto.trim() || !seleccionado) return;
    setEnviando(true);
    const user = usuarios.find(u => u.email === seleccionado);
    await base44.entities.Mensaje.create({
      usuario_email: seleccionado,
      usuario_nombre: user?.nombre || seleccionado,
      texto: texto.trim(),
      es_admin: true,
      leido: false,
    });
    setTexto("");
    setEnviando(false);
    loadMensajes(seleccionado);
  }

  const totalNoLeidos = Object.values(noLeidos).reduce((a, b) => a + b, 0);

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 220px)', minHeight: '320px' }}>
      {/* Lista de usuarios */}
      <div className="w-44 shrink-0 bg-card border border-border rounded-xl overflow-y-auto">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Conversaciones {totalNoLeidos > 0 && <span className="text-red-500">({totalNoLeidos})</span>}
          </p>
        </div>
        {usuarios.length === 0 && (
          <p className="text-xs text-muted-foreground text-center p-4">Sin conversaciones aún</p>
        )}
        {usuarios.map(u => (
          <button
            key={u.email}
            onClick={() => setSeleccionado(u.email)}
            className={`w-full text-left px-3 py-3 border-b border-border hover:bg-muted/50 transition-colors ${seleccionado === u.email ? "bg-muted" : ""}`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-medium truncate">{u.nombre.split(" ")[0]}</p>
              {noLeidos[u.email] > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shrink-0">
                  {noLeidos[u.email]}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{u.ultimoMensaje}</p>
          </button>
        ))}
      </div>

      {/* Panel de mensajes */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {!seleccionado ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Seleccioná un usuario para ver la conversación</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold">{usuarios.find(u => u.email === seleccionado)?.nombre}</p>
              <p className="text-xs text-muted-foreground">{seleccionado}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {mensajes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Sin mensajes aún</p>
              )}
              {mensajes.map((m) => (
                <div key={m.id} className={`flex ${m.es_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.es_admin
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    <p>{m.texto}</p>
                    <p className={`text-[10px] mt-1 ${m.es_admin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
                placeholder="Escribí una respuesta..."
                className="text-sm h-9"
              />
              <Button size="sm" onClick={enviar} disabled={enviando || !texto.trim()} className="h-9 px-3">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}