import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Check,
  CheckCheck,
  XCircle,
  CheckCircle2,
  ChevronDown,
  Search,
  MessageSquarePlus,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePresence } from '@/store/presence';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

interface Contacto {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  sede?: { id: number; nombre: string } | null;
}
interface Mensaje {
  id: number;
  fromId: number;
  toId: number;
  texto: string;
  tipo: string;
  metadata?: any;
  leido: boolean;
  leidoEn?: string | null;
  creadoEn: string;
  from: { id: number; nombre: string; username: string; rol: string };
  to: { id: number; nombre: string; username: string; rol: string };
}
interface Conv {
  usuario: Contacto;
  ultimo: Mensaje;
  noLeidos: number;
}

export default function Chat() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const online = usePresence((s) => s.online);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const iAmTypingRef = useRef(false);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { prompt: dialogPrompt } = useDialog();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const inbox = useQuery<Conv[]>({
    queryKey: ['chat', 'inbox'],
    queryFn: async () => (await api.get<Conv[]>('/chat/inbox')).data,
    enabled: !!token,
  });

  const contactos = useQuery<Contacto[]>({
    queryKey: ['chat', 'contactos'],
    queryFn: async () => (await api.get<Contacto[]>('/chat/contactos')).data,
    enabled: !!token,
  });

  const conv = useQuery<Mensaje[]>({
    queryKey: ['chat', 'with', activeUserId],
    queryFn: async () =>
      (await api.get<Mensaje[]>(`/chat/with/${activeUserId}`)).data,
    enabled: !!token && !!activeUserId,
  });

  // Marca como leído al abrir una conversación
  useEffect(() => {
    if (activeUserId) {
      api.patch(`/chat/read/${activeUserId}`).then(() => {
        qc.invalidateQueries({ queryKey: ['chat', 'inbox'] });
      });
      // focus input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeUserId, qc]);

  // Sockets: nuevos mensajes, typing, leído
  useEffect(() => {
    if (!token) return;
    const s = getSocket();

    const onMsg = (m: Mensaje) => {
      qc.invalidateQueries({ queryKey: ['chat', 'inbox'] });
      if (activeUserId && (m.fromId === activeUserId || m.toId === activeUserId)) {
        qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
        // Auto-marcar como leído si yo soy el receptor y tengo la conv abierta
        if (m.toId === usuario?.id && m.fromId === activeUserId) {
          api.patch(`/chat/read/${activeUserId}`).catch(() => {});
        }
      }
      if (m.toId === usuario?.id && m.fromId !== activeUserId) {
        const esAnulacion = m.tipo === 'ANULACION_REQUEST';
        toast({
          type: esAnulacion ? 'warning' : 'info',
          title: esAnulacion
            ? `Solicitud de anulación de ${m.from.nombre}`
            : `Mensaje de ${m.from.nombre}`,
          description: m.texto.split('\n')[0].slice(0, 80),
        });
      }
    };
    s.on('chat:mensaje', onMsg);

    const onTyping = ({ fromId, typing }: { fromId: number; typing: boolean }) => {
      if (fromId === activeUserId) setPartnerTyping(typing);
    };
    s.on('chat:typing', onTyping);

    const onLeido = ({ byUserId, leidoEn }: { byUserId: number; leidoEn: string }) => {
      qc.setQueryData<Mensaje[]>(['chat', 'with', byUserId], (prev) =>
        prev?.map((m) =>
          m.toId === byUserId && !m.leido
            ? { ...m, leido: true, leidoEn }
            : m,
        ),
      );
    };
    s.on('chat:leido', onLeido);

    return () => {
      s.off('chat:mensaje', onMsg);
      s.off('chat:typing', onTyping);
      s.off('chat:leido', onLeido);
    };
  }, [token, activeUserId, qc, toast, usuario?.id]);

  useEffect(() => setPartnerTyping(false), [activeUserId]);

  const emitTyping = (typing: boolean) => {
    if (!activeUserId) return;
    try {
      getSocket().emit('chat:typing', { toId: activeUserId, typing });
    } catch {}
  };

  const onTextoChange = (v: string) => {
    setTexto(v);
    if (!activeUserId) return;
    if (!iAmTypingRef.current && v.length > 0) {
      iAmTypingRef.current = true;
      emitTyping(true);
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      iAmTypingRef.current = false;
      emitTyping(false);
    }, 1500);
  };

  // Auto-scroll solo si estás cerca del fondo
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conv.data]);

  useEffect(() => {
    if (activeUserId) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      }, 30);
    }
  }, [activeUserId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(d > 200);
  };

  const enviar = useMutation({
    mutationFn: async () => {
      if (!activeUserId || !texto.trim()) return;
      return (
        await api.post('/chat/send', {
          toId: activeUserId,
          texto: texto.trim(),
        })
      ).data;
    },
    onSuccess: () => {
      setTexto('');
      if (iAmTypingRef.current) {
        iAmTypingRef.current = false;
        emitTyping(false);
      }
      qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
      qc.invalidateQueries({ queryKey: ['chat', 'inbox'] });
    },
  });

  const aprobar = useMutation({
    mutationFn: async ({ anulacionId, respuesta }: { anulacionId: number; respuesta?: string }) =>
      (await api.patch(`/anulaciones/${anulacionId}/aprobar`, { respuesta })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      qc.invalidateQueries({ queryKey: ['anulaciones'] });
    },
  });

  const rechazar = useMutation({
    mutationFn: async ({ anulacionId, respuesta }: { anulacionId: number; respuesta?: string }) =>
      (await api.patch(`/anulaciones/${anulacionId}/rechazar`, { respuesta })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
      qc.invalidateQueries({ queryKey: ['anulaciones'] });
    },
  });

  // Combina conversaciones (con último mensaje y no leídos) + contactos sin conv
  const listaUsuarios = useMemo(() => {
    const byUserId = new Map<
      number,
      {
        usuario: Contacto;
        ultimo?: Mensaje;
        noLeidos: number;
      }
    >();

    for (const c of inbox.data || []) {
      byUserId.set(c.usuario.id, {
        usuario: c.usuario,
        ultimo: c.ultimo,
        noLeidos: c.noLeidos,
      });
    }
    for (const u of contactos.data || []) {
      if (!byUserId.has(u.id)) {
        byUserId.set(u.id, { usuario: u, noLeidos: 0 });
      }
    }

    const arr = Array.from(byUserId.values());

    // Ordena: primero los que tienen último mensaje (por fecha desc), después el resto alfabético
    arr.sort((a, b) => {
      if (a.ultimo && b.ultimo) {
        return (
          new Date(b.ultimo.creadoEn).getTime() -
          new Date(a.ultimo.creadoEn).getTime()
        );
      }
      if (a.ultimo) return -1;
      if (b.ultimo) return 1;
      return a.usuario.nombre.localeCompare(b.usuario.nombre);
    });

    const q = filtro.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(
      (x) =>
        x.usuario.nombre.toLowerCase().includes(q) ||
        x.usuario.username.toLowerCase().includes(q) ||
        x.usuario.rol.toLowerCase().includes(q),
    );
  }, [inbox.data, contactos.data, filtro]);

  const totalNoLeidos = useMemo(
    () => listaUsuarios.reduce((s, x) => s + x.noLeidos, 0),
    [listaUsuarios],
  );

  const activeContacto = useMemo(
    () => listaUsuarios.find((x) => x.usuario.id === activeUserId)?.usuario || null,
    [activeUserId, listaUsuarios],
  );

  if (!token) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden h-[calc(100vh-8rem)] flex border border-slate-100">
      {/* COLUMNA IZQUIERDA · Lista de usuarios */}
      <aside
        className={`w-full md:w-[340px] border-r border-slate-100 flex flex-col ${
          activeUserId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header lista */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-hotel text-xl font-bold text-slate-900">
                Conversaciones
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                {online.size} usuario{online.size === 1 ? '' : 's'} en línea
              </div>
            </div>
            {totalNoLeidos > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {totalNoLeidos}
              </span>
            )}
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nombre, usuario o rol"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto scroll-premium">
          {listaUsuarios.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-16 px-6">
              {filtro
                ? 'Sin resultados para tu búsqueda.'
                : 'Sin contactos en esta sede.'}
            </div>
          )}
          {listaUsuarios.map((x) => (
            <button
              key={x.usuario.id}
              onClick={() => setActiveUserId(x.usuario.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-l-2 ${
                activeUserId === x.usuario.id
                  ? 'bg-violet-50 border-violet-500'
                  : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${
                    x.noLeidos > 0
                      ? 'bg-gradient-to-br from-violet-500 to-violet-700'
                      : 'bg-gradient-to-br from-slate-400 to-slate-600'
                  }`}
                >
                  {x.usuario.nombre?.[0]?.toUpperCase()}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    online.has(x.usuario.id) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <div
                    className={`truncate text-sm ${
                      x.noLeidos > 0
                        ? 'font-bold text-slate-900'
                        : 'font-semibold text-slate-800'
                    }`}
                  >
                    {x.usuario.nombre}
                  </div>
                  {x.ultimo && (
                    <div className="text-[10px] text-slate-400 shrink-0">
                      {shortRelative(new Date(x.ultimo.creadoEn))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2 mt-0.5">
                  <div className="text-xs text-slate-500 truncate">
                    {x.ultimo ? (
                      <>
                        {x.ultimo.fromId === usuario?.id && (
                          <span className="text-slate-400 mr-1">Tú:</span>
                        )}
                        {x.ultimo.tipo === 'ANULACION_REQUEST' && '⚠ '}
                        {x.ultimo.tipo === 'ANULACION_APROBADA' && '✓ '}
                        {x.ultimo.tipo === 'ANULACION_RECHAZADA' && '✕ '}
                        {x.ultimo.texto.split('\n')[0]}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">
                        {x.usuario.rol.replace('_', ' ').toLowerCase()}
                      </span>
                    )}
                  </div>
                  {x.noLeidos > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                      {x.noLeidos}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* COLUMNA DERECHA · Conversación */}
      <section
        className={`flex-1 flex-col bg-slate-50 ${
          activeUserId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!activeUserId ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-100 text-violet-600 mb-4">
                <MessageSquarePlus size={32} />
              </div>
              <h3 className="font-hotel text-xl font-bold text-slate-800 mb-1">
                Selecciona una conversación
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Elige a un usuario de la lista para ver los mensajes o iniciar
                una conversación nueva.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header conversación */}
            <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveUserId(null)}
                className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft size={18} />
              </button>
              {activeContacto && (
                <>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold">
                      {activeContacto.nombre?.[0]?.toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        online.has(activeContacto.id)
                          ? 'bg-emerald-500'
                          : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      {activeContacto.nombre}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      {partnerTyping ? (
                        <span className="text-violet-600 font-medium flex items-center gap-1">
                          <span className="flex gap-0.5">
                            <span
                              className="w-1 h-1 rounded-full bg-violet-500 animate-bounce"
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className="w-1 h-1 rounded-full bg-violet-500 animate-bounce"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="w-1 h-1 rounded-full bg-violet-500 animate-bounce"
                              style={{ animationDelay: '300ms' }}
                            />
                          </span>
                          escribiendo...
                        </span>
                      ) : online.has(activeContacto.id) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          en línea · {activeContacto.rol.replace('_', ' ').toLowerCase()}
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          desconectado · {activeContacto.rol.replace('_', ' ').toLowerCase()}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mensajes */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto scroll-premium px-6 py-4 relative"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.05) 0%, transparent 60%)',
              }}
            >
              <div className="max-w-3xl mx-auto space-y-1">
                {conv.isLoading && (
                  <div className="text-center text-slate-400 text-sm py-10">
                    Cargando mensajes...
                  </div>
                )}
                {conv.data?.map((m, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1] : null;
                  const nuevoDia =
                    !prev ||
                    !mismoDia(new Date(prev.creadoEn), new Date(m.creadoEn));
                  const agrupado =
                    !!prev &&
                    prev.fromId === m.fromId &&
                    !nuevoDia &&
                    new Date(m.creadoEn).getTime() -
                      new Date(prev.creadoEn).getTime() <
                      3 * 60_000 &&
                    prev.tipo === 'TEXTO' &&
                    m.tipo === 'TEXTO';
                  return (
                    <div key={m.id}>
                      {nuevoDia && <DateSeparator fecha={new Date(m.creadoEn)} />}
                      <MessageBubble
                        m={m}
                        yoId={usuario?.id || 0}
                        esAdmin={
                          usuario?.rol === 'SUPERADMIN' ||
                          usuario?.rol === 'ADMIN_SEDE'
                        }
                        agrupado={agrupado}
                        onAprobar={(anulId) =>
                          aprobar.mutate({ anulacionId: anulId })
                        }
                        onRechazar={async (anulId) => {
                          const respuesta = await dialogPrompt({
                            title: 'Rechazar anulación',
                            message: 'Indica la razón del rechazo (opcional).',
                            placeholder: 'Motivo...',
                            multiline: true,
                            variant: 'danger',
                            confirmText: 'Rechazar',
                          });
                          if (respuesta === null) return;
                          rechazar.mutate({
                            anulacionId: anulId,
                            respuesta: respuesta || undefined,
                          });
                        }}
                      />
                    </div>
                  );
                })}
                {conv.data?.length === 0 && !conv.isLoading && (
                  <div className="text-center text-slate-400 text-sm py-16">
                    <MessageSquarePlus
                      size={28}
                      className="mx-auto mb-2 opacity-60"
                    />
                    Inicia la conversación enviando un mensaje.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              {showScrollDown && (
                <button
                  onClick={() =>
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="sticky bottom-2 left-[calc(100%-3rem)] w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-violet-600 hover:bg-violet-50 btn-press animate-fade-in"
                  aria-label="Bajar al final"
                >
                  <ChevronDown size={18} />
                </button>
              )}
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-100 p-3 shrink-0">
              <div className="max-w-3xl mx-auto flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={(e) => onTextoChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviar.mutate();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 max-h-32 bg-slate-50 focus:bg-white"
                />
                <button
                  onClick={() => enviar.mutate()}
                  disabled={!texto.trim() || enviar.isPending}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-white flex items-center justify-center btn-press disabled:opacity-40 shadow-md shadow-violet-500/30"
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 text-center mt-1.5">
                Enter para enviar · Shift + Enter para nueva línea
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// -------- MessageBubble + helpers --------

function MessageBubble({
  m,
  yoId,
  esAdmin,
  agrupado,
  onAprobar,
  onRechazar,
}: {
  m: Mensaje;
  yoId: number;
  esAdmin: boolean;
  agrupado?: boolean;
  onAprobar: (anulId: number) => void;
  onRechazar: (anulId: number) => void;
}) {
  const mine = m.fromId === yoId;
  const isAnulacionReq = m.tipo === 'ANULACION_REQUEST';
  const isAprobada = m.tipo === 'ANULACION_APROBADA';
  const isRechazada = m.tipo === 'ANULACION_RECHAZADA';
  const isEspecial = isAnulacionReq || isAprobada || isRechazada;
  const anulId = m.metadata?.anulacionId;

  let bubbleClass = '';
  if (isAnulacionReq)
    bubbleClass = 'bg-amber-50 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-500/40';
  else if (isAprobada)
    bubbleClass = 'bg-emerald-50 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-500/40';
  else if (isRechazada)
    bubbleClass = 'bg-rose-50 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-500/40';
  else if (mine)
    bubbleClass = 'bg-gradient-to-br from-violet-600 to-violet-500 text-white';
  else
    bubbleClass = 'bg-white text-slate-800 border border-slate-100';

  const cornerMine = agrupado ? 'rounded-2xl' : 'rounded-2xl rounded-br-sm';
  const cornerOther = agrupado ? 'rounded-2xl' : 'rounded-2xl rounded-bl-sm';
  const corner = isEspecial
    ? 'rounded-2xl'
    : mine
      ? cornerMine
      : cornerOther;

  return (
    <div
      className={`flex ${mine ? 'justify-end' : 'justify-start'} ${agrupado ? 'mt-0.5' : 'mt-2'}`}
    >
      <div className={`max-w-[70%] px-3.5 py-2 shadow-sm ${bubbleClass} ${corner}`}>
        {isAnulacionReq && (
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider">
            <XCircle size={11} /> Solicitud de anulación
          </div>
        )}
        {isAprobada && (
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={11} /> Anulación aprobada
          </div>
        )}
        {isRechazada && (
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider">
            <XCircle size={11} /> Anulación rechazada
          </div>
        )}
        <div className="whitespace-pre-line text-sm leading-snug">{m.texto}</div>

        {isAnulacionReq && esAdmin && !mine && anulId && (
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => onAprobar(anulId)}
              className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 btn-press"
            >
              <Check size={12} /> Aprobar
            </button>
            <button
              onClick={() => onRechazar(anulId)}
              className="flex-1 text-xs bg-rose-500 hover:bg-rose-600 text-white px-2 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 btn-press"
            >
              <XCircle size={12} /> Rechazar
            </button>
          </div>
        )}

        <div
          className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'} ${mine && !isEspecial ? 'text-violet-100' : 'text-slate-500 opacity-70'}`}
        >
          <span>
            {new Date(m.creadoEn).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {mine && !isEspecial && (
            <span
              title={
                m.leido
                  ? `Leído${m.leidoEn ? ' ' + new Date(m.leidoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}`
                  : 'Entregado'
              }
              className={m.leido ? 'text-sky-300' : 'text-violet-200'}
            >
              {m.leido ? <CheckCheck size={12} /> : <Check size={12} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function mismoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function DateSeparator({ fecha }: { fecha: Date }) {
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  let label: string;
  if (mismoDia(fecha, hoy)) label = 'Hoy';
  else if (mismoDia(fecha, ayer)) label = 'Ayer';
  else
    label = fecha.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: fecha.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined,
    });
  return (
    <div className="flex justify-center my-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-white/80 dark:bg-slate-800/70 backdrop-blur border border-slate-200 rounded-full px-3 py-1 shadow-sm">
        {label}
      </span>
    </div>
  );
}

function shortRelative(fecha: Date) {
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(fecha, hoy))
    return fecha.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  if (mismoDia(fecha, ayer)) return 'Ayer';
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
  });
}
