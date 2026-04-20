import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  X,
  Send,
  ArrowLeft,
  Check,
  XCircle,
  CheckCircle2,
  Users as UsersIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { getSocket } from '@/lib/socket';
import { useToast } from './ToastProvider';

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
  const [abierto, setAbierto] = useState(false);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    refetchInterval: 10_000,
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
    return () => {
      s.off('chat:mensaje', onMsg);
    };
  }, [token, activeUserId, qc, toast, usuario?.id]);

  // Auto-scroll al fondo cuando cambian los mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv.data, activeUserId]);

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
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm font-bold">
                    {activeContacto.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {activeContacto.nombre}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-violet-200">
                      {activeContacto.rol?.replace('_', ' ')}
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
          <div className="flex-1 overflow-y-auto scroll-premium bg-slate-50">
            {!activeUserId ? (
              // Lista de conversaciones + contactos
              <Inbox
                conversaciones={inbox.data || []}
                contactos={contactos.data || []}
                onSelect={(uid) => setActiveUserId(uid)}
              />
            ) : (
              // Conversación
              <div className="p-3 space-y-2">
                {conv.data?.map((m) => (
                  <MessageBubble
                    key={m.id}
                    m={m}
                    yoId={usuario?.id || 0}
                    esAdmin={
                      usuario?.rol === 'SUPERADMIN' ||
                      usuario?.rol === 'ADMIN_SEDE'
                    }
                    onAprobar={(anulId) =>
                      aprobar.mutate({ anulacionId: anulId })
                    }
                    onRechazar={(anulId) => {
                      const respuesta = prompt('Razón del rechazo (opcional):');
                      rechazar.mutate({
                        anulacionId: anulId,
                        respuesta: respuesta || undefined,
                      });
                    }}
                  />
                ))}
                {conv.data?.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-6">
                    Inicia la conversación enviando un mensaje.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          {activeUserId && (
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex gap-2 items-end">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
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
  onSelect,
}: {
  conversaciones: Conv[];
  contactos: Contacto[];
  onSelect: (uid: number) => void;
}) {
  const yaConversando = new Set(conversaciones.map((c) => c.usuario.id));
  const nuevos = contactos.filter((c) => !yaConversando.has(c.id));

  return (
    <div>
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
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold shrink-0">
                {c.usuario.nombre?.[0]?.toUpperCase()}
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
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                {u.nombre?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {u.nombre}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
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
  onAprobar,
  onRechazar,
}: {
  m: Mensaje;
  yoId: number;
  esAdmin: boolean;
  onAprobar: (anulId: number) => void;
  onRechazar: (anulId: number) => void;
}) {
  const mine = m.fromId === yoId;
  const isAnulacionReq = m.tipo === 'ANULACION_REQUEST';
  const isAprobada = m.tipo === 'ANULACION_APROBADA';
  const isRechazada = m.tipo === 'ANULACION_RECHAZADA';
  const anulId = m.metadata?.anulacionId;

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
          mine
            ? 'bg-gradient-to-br from-violet-600 to-violet-500 text-white rounded-br-sm'
            : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
        } ${isAnulacionReq ? '!bg-amber-50 !text-amber-900 border border-amber-300' : ''}
        ${isAprobada ? '!bg-emerald-50 !text-emerald-900 border border-emerald-300' : ''}
        ${isRechazada ? '!bg-rose-50 !text-rose-900 border border-rose-300' : ''}`}
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
          className={`text-[10px] mt-1 ${mine && !isAnulacionReq && !isAprobada && !isRechazada ? 'text-violet-100' : 'text-slate-400'}`}
        >
          {new Date(m.creadoEn).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
