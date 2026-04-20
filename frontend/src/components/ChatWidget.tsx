import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  X,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  XCircle,
  CheckCircle2,
  ChevronDown,
  Users as UsersIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePresence } from '@/store/presence';
import { getSocket } from '@/lib/socket';
import { useToast } from './ToastProvider';
import { useDialog } from './ConfirmProvider';

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

export default function ChatWidget() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const online = usePresence((s) => s.online);
  const [abierto, setAbierto] = useState(false);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const iAmTypingRef = useRef(false);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { prompt: dialogPrompt } = useDialog();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Permite abrir el chat con un usuario específico desde cualquier parte
  useEffect(() => {
    const handler = (e: any) => {
      const uid = e?.detail?.userId;
      if (uid) {
        setActiveUserId(uid);
        setAbierto(true);
      } else {
        setAbierto(true);
      }
    };
    window.addEventListener('chat:open', handler as any);
    return () => window.removeEventListener('chat:open', handler as any);
  }, []);

  const inbox = useQuery<Conv[]>({
    queryKey: ['chat', 'inbox'],
    queryFn: async () => (await api.get<Conv[]>('/chat/inbox')).data,
    enabled: !!token,
  });

  const contactos = useQuery<Contacto[]>({
    queryKey: ['chat', 'contactos'],
    queryFn: async () => (await api.get<Contacto[]>('/chat/contactos')).data,
    enabled: !!token && abierto,
  });

  const conv = useQuery<Mensaje[]>({
    queryKey: ['chat', 'with', activeUserId],
    queryFn: async () =>
      (await api.get<Mensaje[]>(`/chat/with/${activeUserId}`)).data,
    enabled: !!token && !!activeUserId,
  });

  // Marcar como leído al abrir conversación
  useEffect(() => {
    if (activeUserId && abierto) {
      api.patch(`/chat/read/${activeUserId}`).then(() => {
        qc.invalidateQueries({ queryKey: ['chat', 'inbox'] });
      });
    }
  }, [activeUserId, abierto, qc]);

  // Escuchar socket para nuevos mensajes
  useEffect(() => {
    if (!token) return;
    const s = getSocket();
    const onMsg = (m: Mensaje) => {
      qc.invalidateQueries({ queryKey: ['chat', 'inbox'] });
      if (activeUserId && (m.fromId === activeUserId || m.toId === activeUserId)) {
        qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
      }
      // Toast solo si es para mí y no estoy en la conversación abierta
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

    // Doble check: el otro usuario leyó mis mensajes → actualiza cache
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

  // Limpia el "escribiendo" al cambiar de conversación
  useEffect(() => {
    setPartnerTyping(false);
  }, [activeUserId]);

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

  // Auto-scroll al fondo SOLO si ya estamos cerca del fondo
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conv.data]);

  // Al cambiar de conversación, va al fondo sí o sí
  useEffect(() => {
    if (activeUserId) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      }, 20);
    }
  }, [activeUserId]);

  // Botón "bajar" cuando el usuario scrollea hacia arriba
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(d > 150);
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
      // Apaga el estado "escribiendo" al enviar
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
      (await api.patch(`/anulaciones/${anulacionId}/aprobar`, { respuesta }))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      qc.invalidateQueries({ queryKey: ['anulaciones'] });
    },
  });

  const rechazar = useMutation({
    mutationFn: async ({ anulacionId, respuesta }: { anulacionId: number; respuesta?: string }) =>
      (await api.patch(`/anulaciones/${anulacionId}/rechazar`, { respuesta }))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'with', activeUserId] });
      qc.invalidateQueries({ queryKey: ['anulaciones'] });
    },
  });

  const totalNoLeidos = useMemo(
    () => inbox.data?.reduce((s, c) => s + c.noLeidos, 0) ?? 0,
    [inbox.data],
  );

  const activeContacto = useMemo(() => {
    if (!activeUserId) return null;
    return (
      inbox.data?.find((c) => c.usuario.id === activeUserId)?.usuario ||
      contactos.data?.find((c) => c.id === activeUserId) ||
      null
    );
  }, [activeUserId, inbox.data, contactos.data]);

  if (!token) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-white shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 transition btn-press"
        aria-label="Abrir chat"
      >
        <MessageSquare size={22} />
        {totalNoLeidos > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
            {totalNoLeidos > 9 ? '9+' : totalNoLeidos}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="fixed bottom-5 right-5 z-[61] w-[380px] max-w-[95vw] h-[560px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-700 to-violet-600 text-white px-4 py-3 flex items-center gap-3">
            {activeUserId && (
              <button
                onClick={() => setActiveUserId(null)}
                className="p-1 hover:bg-white/10 rounded-lg btn-press"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {activeUserId && activeContacto ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm font-bold">
                      {activeContacto.nombre?.[0]?.toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-violet-700 ${
                        online.has(activeContacto.id)
                          ? 'bg-emerald-400'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {activeContacto.nombre}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-violet-200 flex items-center gap-1">
                      {online.has(activeContacto.id) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          en línea
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          desconectado · {activeContacto.rol?.replace('_', ' ')}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-hotel text-lg font-bold">Chat interno</div>
                  <div className="text-[11px] text-violet-200">
                    {usuario?.sede?.nombre || 'Caribe Hotel'}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="p-1 hover:bg-white/10 rounded-lg btn-press"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contenido */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto scroll-premium bg-slate-50 relative"
          >
            {!activeUserId ? (
              // Lista de conversaciones + contactos
              <Inbox
                conversaciones={inbox.data || []}
                contactos={contactos.data || []}
                online={online}
                onSelect={(uid) => setActiveUserId(uid)}
              />
            ) : (
              // Conversación con separadores de fecha y agrupación
              <div className="p-3 space-y-1">
                {conv.data?.map((m, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1] : null;
                  const nuevoDia =
                    !prev ||
                    !mismoDia(new Date(prev.creadoEn), new Date(m.creadoEn));
                  const agrupadoConAnterior =
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
                      {nuevoDia && (
                        <DateSeparator fecha={new Date(m.creadoEn)} />
                      )}
                      <MessageBubble
                        m={m}
                        yoId={usuario?.id || 0}
                        esAdmin={
                          usuario?.rol === 'SUPERADMIN' ||
                          usuario?.rol === 'ADMIN_SEDE'
                        }
                        agrupado={agrupadoConAnterior}
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
                {conv.data?.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-6">
                    Inicia la conversación enviando un mensaje.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
            {showScrollDown && activeUserId && (
              <button
                onClick={() =>
                  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
                }
                className="sticky bottom-2 left-[calc(100%-3rem)] w-9 h-9 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-violet-600 hover:bg-violet-50 btn-press animate-fade-in"
                aria-label="Bajar al final"
              >
                <ChevronDown size={16} />
              </button>
            )}
          </div>

          {/* Input */}
          {activeUserId && (
            <div className="border-t border-slate-100 bg-white">
              {/* Indicador 'escribiendo...' */}
              {partnerTyping && (
                <div className="px-4 pt-2 pb-1 flex items-center gap-2 text-[11px] text-violet-600 animate-fade-in">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="font-medium">
                    {activeContacto?.nombre?.split(' ')[0] || 'El contacto'} está escribiendo...
                  </span>
                </div>
              )}
              <div className="p-3 flex gap-2 items-end">
                <textarea
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
                  className="flex-1 resize-none border border-slate-200 rounded-2xl px-3.5 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 max-h-24"
                />
                <button
                  onClick={() => enviar.mutate()}
                  disabled={!texto.trim() || enviar.isPending}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-white flex items-center justify-center btn-press disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Inbox({
  conversaciones,
  contactos,
  online,
  onSelect,
}: {
  conversaciones: Conv[];
  contactos: Contacto[];
  online: Set<number>;
  onSelect: (uid: number) => void;
}) {
  const onlineCount = contactos.filter((c) => online.has(c.id)).length;
  const yaConversando = new Set(conversaciones.map((c) => c.usuario.id));
  const nuevos = contactos.filter((c) => !yaConversando.has(c.id));

  return (
    <div>
      {/* Indicador de gente online */}
      <div className="px-4 py-2 bg-emerald-50/40 border-b border-emerald-100 flex items-center gap-2 text-xs">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-emerald-700 font-semibold">
          {onlineCount} conectado{onlineCount === 1 ? '' : 's'} ahora
        </span>
      </div>

      {conversaciones.length > 0 && (
        <div>
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Conversaciones
          </div>
          {conversaciones.map((c) => (
            <button
              key={c.usuario.id}
              onClick={() => onSelect(c.usuario.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white transition text-left"
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold">
                  {c.usuario.nombre?.[0]?.toUpperCase()}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-50 ${
                    online.has(c.usuario.id)
                      ? 'bg-emerald-500'
                      : 'bg-slate-400'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <div className="font-semibold text-slate-800 truncate text-sm">
                    {c.usuario.nombre}
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0">
                    {new Date(c.ultimo.creadoEn).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <div className="text-xs text-slate-500 truncate">
                    {c.ultimo.texto.split('\n')[0]}
                  </div>
                  {c.noLeidos > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {c.noLeidos}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {nuevos.length > 0 && (
        <div>
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <UsersIcon size={11} /> Personal de la sede
          </div>
          {nuevos.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelect(u.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white transition text-left"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                  {u.nombre?.[0]?.toUpperCase()}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-50 ${
                    online.has(u.id) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {u.nombre}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  {online.has(u.id) && (
                    <span className="text-emerald-600 font-bold normal-case tracking-normal">
                      en línea ·
                    </span>
                  )}
                  {u.rol?.replace('_', ' ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {conversaciones.length === 0 && nuevos.length === 0 && (
        <div className="text-center text-slate-400 text-sm py-12 px-4">
          Sin contactos en esta sede
        </div>
      )}
    </div>
  );
}

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
    bubbleClass = 'bg-amber-50 text-amber-900 border border-amber-300';
  else if (isAprobada)
    bubbleClass = 'bg-emerald-50 text-emerald-900 border border-emerald-300';
  else if (isRechazada)
    bubbleClass = 'bg-rose-50 text-rose-900 border border-rose-300';
  else if (mine)
    bubbleClass =
      'bg-gradient-to-br from-violet-600 to-violet-500 text-white';
  else
    bubbleClass = 'bg-white text-slate-800 border border-slate-100';

  // Esquinas: WhatsApp-like → la "cola" se muestra solo en el primero del grupo
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
      <div
        className={`max-w-[80%] px-3 py-2 shadow-sm ${bubbleClass} ${corner}`}
      >
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

// ------ Helpers de fecha / agrupación ------

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
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-white/80 backdrop-blur border border-slate-200 rounded-full px-3 py-1 shadow-sm">
        {label}
      </span>
    </div>
  );
}
