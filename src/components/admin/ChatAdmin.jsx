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

  useEffect(() => { seleccionadoRef.current = seleccionado; }, [seleccionado]);

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
    const emailsUnicos = [...new Set(todos.map(m => m.usuario_email))];
    const nl = {};
    const lista = emailsUnicos.map(email => {
      const msgs = todos.filter(m => m.usuario_email === email);
      nl[email] = msgs.filter(m => !m.es_admin && !m.leido).length;
      const userMsg = msgs.find(m => !m.es_admin);
      return {
        email,
        nombre: userMsg?.usuario_nombre || msgs[0]?.usuario_nombre || email,
        ultimoMensaje: msgs[0]?.texto || "",
      };
    });
    setNoLeidos(nl);
    setUsuarios(lista);
  }

  async function loadMensajes(email) {
    const data = await base44.entities.Mensaje.filter({ usuario_email: email }, "created_date");
    setMensajes(data);
    const sinLeer = data.filter(m => !m.es_admin && !m.leido);
    await Promise.all(sinLeer.map(m => base44.entities.Mensaje.update(m.id, { leido: true })));
    if (sinLeer.length > 0) setNoLeidos(prev => ({ ...prev, [email]: 0 }));
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

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card" style={{ height: "500px", display: "flex" }}>
      {/* Lista de usuarios */}
      <div style={{ width: "160px", flexShrink: 0, borderRight: "1px solid hsl(var(--border))", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Usuarios</p>
        </div>
        {usuarios.length === 0 && (
          <p className="text-xs text-muted-foreground text-center p-4">Sin conversaciones</p>
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!seleccionado ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="text-sm text-muted-foreground">Seleccioná un usuario</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0">
              <p className="text-sm font-semibold">{usuarios.find(u => u.email === seleccionado)?.nombre}</p>
              <p className="text-xs text-muted-foreground">{seleccionado}</p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
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

            <div className="p-2 border-t border-border flex gap-2 shrink-0">
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