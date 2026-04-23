// ─────────────────────────────────────────────────────────────
// Componentes auxiliares: Carrusel, WhatsApp, Reveal
// ─────────────────────────────────────────────────────────────

// Carrusel simple de imágenes, con autoplay opcional
function PhotoCarousel({ images, alt = '', autoplay = false, interval = 4000, rounded = 0, height = '100%', showDots = true, showArrows = true, onClick }) {
  const [idx, setIdx] = React.useState(0);
  const [hovering, setHovering] = React.useState(false);
  const total = images.length;

  React.useEffect(() => {
    if (!autoplay || hovering) return;
    const t = setInterval(() => setIdx(i => (i + 1) % total), interval);
    return () => clearInterval(t);
  }, [autoplay, hovering, total, interval]);

  const go = (n) => setIdx((n + total) % total);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
      style={{
        position: 'relative', width: '100%', height, overflow: 'hidden',
        borderRadius: rounded, cursor: onClick ? 'pointer' : 'default', background: '#2B1B3D',
      }}>
      {images.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === idx ? 1 : 0,
          transform: i === idx ? 'scale(1)' : 'scale(1.04)',
          transition: 'opacity 0.7s cubic-bezier(.2,.7,.3,1), transform 5s ease-out',
        }}/>
      ))}

      {/* Gradient overlay on hover */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.35) 100%)',
        opacity: showArrows || showDots ? 1 : 0, pointerEvents: 'none',
      }}/>

      {/* Arrows */}
      {showArrows && total > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(idx - 1); }}
            style={{
              position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.95)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              opacity: hovering ? 1 : 0, transition: 'opacity .2s',
            }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3l-4 4 4 4"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(idx + 1); }}
            style={{
              position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.95)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              opacity: hovering ? 1 : 0, transition: 'opacity .2s',
            }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l4 4-4 4"/></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && total > 1 && (
        <div style={{
          position: 'absolute', bottom: 12, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 6,
        }}>
          {images.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); go(i); }}
              style={{
                width: i === idx ? 22 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer', transition: 'all .3s',
              }}/>
          ))}
        </div>
      )}

      {/* Photo counter */}
      {total > 1 && (
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          background: 'rgba(30,20,16,0.78)', color: '#fff',
          padding: '4px 9px', fontSize: 11, borderRadius: 3,
          display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="12" cy="12" r="3"/></svg>
          {idx + 1} / {total}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Botón flotante de WhatsApp
// ─────────────────────────────────────────────────────────────
function WhatsAppFab({ phone = '51984123456', message = 'Hola, quiero reservar en Hs Sol Caribe 🌴' }) {
  const [open, setOpen] = React.useState(false);
  const [bump, setBump] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setBump(true), 2500);
    const t2 = setTimeout(() => setBump(false), 5500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <>
      {/* Panel flotante */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 100, right: 24, zIndex: 1000,
          width: 320, background: '#fff', borderRadius: 16,
          boxShadow: '0 14px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
          animation: 'ch-fadeUp .35s cubic-bezier(.2,.7,.3,1) forwards',
        }}>
          {/* Header */}
          <div style={{ background: '#075E54', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={HOTEL.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Hs Sol Caribe</div>
              <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4FC56F' }}/>
                En línea · responde en minutos
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, opacity: 0.8 }}>×</button>
          </div>
          {/* Body with bubble */}
          <div style={{ background: '#ECE5DD', padding: '20px 16px', minHeight: 140, position: 'relative' }}>
            <div style={{
              background: '#fff', padding: '10px 14px', borderRadius: '0 12px 12px 12px',
              maxWidth: '85%', fontSize: 13, lineHeight: 1.5, color: '#333',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}>
              ¡Hola! 👋 Soy María, del equipo de Hs Sol Caribe.
              <br/><br/>
              ¿En qué puedo ayudarte con tu reserva?
              <div style={{ fontSize: 10, color: '#999', textAlign: 'right', marginTop: 6 }}>10:42 ✓✓</div>
            </div>
          </div>
          {/* CTA */}
          <a href={href} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#25D366', color: '#fff', padding: '14px',
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}>
            <WhatsAppIcon size={20}/>
            Iniciar conversación
          </a>
        </div>
      )}

      {/* FAB button */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          width: 62, height: 62, borderRadius: '50%', border: 'none',
          background: '#25D366', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(37,211,102,0.45), 0 2px 6px rgba(0,0,0,0.15)',
          transition: 'transform .2s',
          animation: bump ? 'ch-wabump 0.8s ease' : 'none',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
        <WhatsAppIcon size={30}/>
        {/* Pulsing ring */}
        <span style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          border: '2px solid #25D366', opacity: 0.6,
          animation: 'ch-wapulse 2.2s infinite ease-out', pointerEvents: 'none',
        }}/>
        {/* Unread dot */}
        {!open && (
          <span style={{
            position: 'absolute', top: 2, right: 4, width: 18, height: 18, borderRadius: '50%',
            background: '#FF3B30', color: '#fff', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>1</span>
        )}
      </button>
    </>
  );
}

function WhatsAppIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

Object.assign(window, { PhotoCarousel, WhatsAppFab, WhatsAppIcon });
