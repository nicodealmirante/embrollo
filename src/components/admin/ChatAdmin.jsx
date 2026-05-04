import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";
import { getNombreVisible } from "@/lib/utils";

export default function ChatAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [noLeidos, setNoLeidos] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const bottomRef = useRef(null);
  const seleccionadoRef = useRef(null);

  useEffect(() => { seleccionadoRef.current = seleccionado; }, [seleccionado]);

  useEffect(() => {
    loadUsuarios();
    loadTodosUsuarios();
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

  async function loadTodosUsuarios() {
    const all = await base44.entities.User.list();
    setTodosUsuarios(all.filter(u => u.role !== "admin"));
  }

  async function loadUsuarios() {
    const todos = await base44.entities.Mensaje.list("-created_date");
    const emailsUnicos = [...new Set(todos.map(m => m.usuario_email))];
    const nl = {};
    const allUsers = await base44.entities.User.list();
    const lista = emailsUnicos.map(email => {
      const msgs = todos.filter(m => m.usuario_email === email);
      nl[email] = msgs.filter(m => !m.es_admin && !m.leido).length;
      const userMsg = msgs.find(m => !m.es_admin);
      const matchedUser = allUsers.find(u => u.email === email);
      return {
        email,
        nombre: matchedUser ? getNombreVisible(matchedUser) : (userMsg?.usuario_nombre || msgs[0]?.usuario_nombre || email),
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
    const fromChat = usuarios.find(u => u.email === seleccionado);
    const fromAll = todosUsuarios.find(u => u.email === seleccionado);
    const nombre = fromAll ? getNombreVisible(fromAll) : (fromChat?.nombre || seleccionado);
    await base44.entities.Mensaje.create({
      usuario_email: seleccionado,
      usuario_nombre: nombre,
      texto: texto.trim(),
      es_admin: true,
      leido: false,
    });
    setTexto("");
    setEnviando(false);
    loadMensajes(seleccionado);
    loadUsuarios();
  }

  function iniciarConversacion(user) {
    if (!usuarios.find(u => u.email === user.email)) {
      setUsuarios(prev => [{ email: user.email, nombre: getNombreVisible(user), ultimoMensaje: "" }, ...prev]);
    }
    setSeleccionado(user.email);
    setDialogOpen(false);
  }

  const matchedAll = todosUsuarios.find(u => u.email === seleccionado);
  const nombreSeleccionado = matchedAll ? getNombreVisible(matchedAll) : (usuarios.find(u => u.email === seleccionado)?.nombre || seleccionado);

  return (
    <>
      {/* Layout mobile: muestra lista O mensajes según selección */}
      <div className="border border-border rounded-xl overflow-hidden bg-card flex" style={{ height: "500px" }}>

        {/* Lista de usuarios — oculta en mobile cuando hay seleccionado */}
        <div
          className={`flex-col border-r border-border ${seleccionado ? "hidden sm:flex" : "flex"}`}
          style={{ width: "160px", flexShrink: 0 }}
        >
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Usuarios</p>
            <button onClick={() => setDialogOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="Nuevo mensaje">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
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
        </div>

        {/* Panel de mensajes — ocupa todo en mobile */}
        <div
          className={`flex-col min-w-0 ${seleccionado ? "flex" : "hidden sm:flex"}`}
          style={{ flex: 1 }}
        >
          {!seleccionado ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p className="text-sm text-muted-foreground">Seleccioná un usuario</p>
            </div>
          ) : (
            <>
              <div className="px-3 py-2.5 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
                {/* Botón volver en mobile */}
                <button
                  className="sm:hidden text-muted-foreground hover:text-foreground"
                  onClick={() => setSeleccionado(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{nombreSeleccionado}</p>
                  <p className="text-xs text-muted-foreground truncate">{seleccionado}</p>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {mensajes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Sin mensajes aún. Iniciá la conversación.</p>
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

      {/* Dialog para seleccionar usuario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar mensaje a usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-y-auto mt-2">
            {todosUsuarios.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin usuarios registrados</p>
            )}
            {todosUsuarios.map(u => (
              <button
                key={u.id}
                onClick={() => iniciarConversacion(u)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium">{getNombreVisible(u)}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}