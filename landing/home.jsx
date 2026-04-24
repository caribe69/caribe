// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — Home en estilo transaccional (Choice/Radisson)
// ─────────────────────────────────────────────────────────────

// Iconos para amenidades
const AmenIcon = ({ name, size = 16 }) => {
  const icons = {
    wifi: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>,
    tv: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="13" rx="1.5"/><path d="M8 21h8"/></svg>,
    desk: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 10h18v2H3zM5 12v7M19 12v7M8 10V6h8v4"/></svg>,
    ac: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>,
    hair: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6a4 4 0 0 1 8 0v2l9 3-9 3v4a2 2 0 0 1-4 0v-3H4z"/></svg>,
    iron: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18h16l-2-7a4 4 0 0 0-4-3h-5a5 5 0 0 0-5 5z"/></svg>,
    smoke: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>,
    guest: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>,
    pool: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1M2 22c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1M7 14V5a2 2 0 1 1 4 0M13 14V5a2 2 0 1 1 4 0"/></svg>,
    breakfast: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a3 3 0 0 1 0 6h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3"/></svg>,
    park: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 1 1 0 6H9"/></svg>,
    beach: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="6" r="3"/><path d="M12 9v13M6 15h12M8 20h8"/></svg>,
  };
  return icons[name] || icons.wifi;
};

// Mapeo rápido de amenidades a íconos
function amenityIcon(label) {
  const l = label.toLowerCase();
  if (l.includes('wifi') || l.includes('wi-fi')) return 'wifi';
  if (l.includes('tv')) return 'tv';
  if (l.includes('escritorio')) return 'desk';
  if (l.includes('aire')) return 'ac';
  if (l.includes('secador')) return 'hair';
  if (l.includes('plancha')) return 'iron';
  if (l.includes('fumar') || l.includes('smoking')) return 'smoke';
  if (l.includes('piscina')) return 'pool';
  if (l.includes('desayuno')) return 'breakfast';
  if (l.includes('parque')) return 'park';
  if (l.includes('playa')) return 'beach';
  return 'guest';
}

// ─────────────────────────────────────────────────────────────
// HotelHero — foto grande + info del "hotel" (las 4 sedes como uno)
// ─────────────────────────────────────────────────────────────
function HotelHero({ onNavigate }) {
  return (
    <>
      {/* Video hero + 2 fotos laterales */}
      <div style={{ position: 'relative', height: 420, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 4 }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
            <video
              src="assets/caribevideo.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Degradado sutil inferior para legibilidad si se superpone texto */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent 35%)',
              pointerEvents: 'none',
            }}/>
            {/* Badge "Tour virtual" */}
            <div style={{
              position: 'absolute', top: 16, left: 16,
              background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)',
              padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '0.05em',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z" fill="#fff"/></svg>
              TOUR EN VIVO
            </div>
          </div>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
            <video
              src="assets/presentacion2.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent 35%)',
              pointerEvents: 'none',
            }}/>
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)',
              padding: '5px 10px', fontSize: 10, fontWeight: 600, borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', gap: 5, letterSpacing: '0.05em',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z" fill="#fff"/></svg>
              PRESENTACIÓN
            </div>
          </div>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
            <video
              src="assets/decoracion.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 40%)',
              pointerEvents: 'none',
            }}/>
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)',
              padding: '5px 10px', fontSize: 10, fontWeight: 600, borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', gap: 5, letterSpacing: '0.05em',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z" fill="#fff"/></svg>
              DECORACIÓN
            </div>
            <button style={{
              position: 'absolute', bottom: 16, right: 16,
              background: 'rgba(255,255,255,0.95)', border: '1px solid var(--line)',
              padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, zIndex: 2,
            }} onClick={() => onNavigate('gallery')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Ver todas las fotos
            </button>
          </div>
        </div>
      </div>

      {/* Título del hotel + info */}
      <section style={{ padding: '26px 48px 14px', background: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: 30, alignItems: 'flex-start' }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <span className="ch-badge-brand">VENTA RÁPIDA DEL HOTEL</span>
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Hs Sol Caribe <span style={{ color: 'var(--text-soft)', fontWeight: 500, fontSize: 24 }}>— 4 sedes en el Caribe colombiano</span>
            </h1>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stars count={5} size={14}/>
                <span style={{ fontWeight: 600 }}>4.8</span>
                <span style={{ color: 'var(--text-soft)' }}>2,019 reseñas</span>
              </div>
              <Sep/>
              <span>📍 Rodadero · Cartagena · San Andrés · Minca</span>
              <Sep/>
              <span>📞 +57 305 · 284 · 9123</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13 }}>
              <span className="ch-price-strike">S/ 320</span>
              <span className="ch-price">S/ 165</span>
              <span className="ch-price-unit"> PEN/noche</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>
              <a className="ch-link" style={{ color: 'var(--mar)' }}>Tarifa para socios</a>
              <div style={{ marginTop: 2 }}>S/ 190 total</div>
            </div>
            <button className="ch-btn cta" onClick={() => onNavigate('rooms')} style={{ marginTop: 12, padding: '13px 28px' }}>
              Ver las habitaciones
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Sep() {
  return <span style={{ color: 'var(--line)' }}>·</span>;
}

// ─────────────────────────────────────────────────────────────
// BenefitBanner — "Los socios ahorran 10%"
// ─────────────────────────────────────────────────────────────
function BenefitBanner() {
  return (
    <section style={{ padding: '16px 48px', background: '#fff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="ch-badge-benefit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          Los socios ahorran un 10 %
        </div>
        <div className="ch-badge-benefit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          Podrías ganar 1.080 puntos después de esta estancia
        </div>
        <div className="ch-badge-benefit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          Desayuno incluido en todas las sedes
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SedeTabs — tabs estilo "Todos · 1 cama · Suite" pero para sedes
// ─────────────────────────────────────────────────────────────
function SedeTabs({ active, onChange }) {
  return (
    <section style={{ padding: '28px 48px 18px', background: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Elige la sede que quieres reservar
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`ch-chip ${active === 'all' ? 'active' : ''}`} onClick={() => onChange('all')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-6 9 6M5 10v10h14V10"/></svg>
            Todos los tipos de habitación ({ROOMS.length})
          </button>
          {SEDES.map(s => (
            <button key={s.id} className={`ch-chip ${active === s.id ? 'active' : ''}`} onClick={() => onChange(s.id)}>
              {s.short} ({s.roomCount})
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// RoomsBySede — listado estilo Radisson: foto + datos + precio + CTA
// ─────────────────────────────────────────────────────────────
function RoomsBySede({ onRoomClick, onSedeClick }) {
  const [activeSede, setActiveSede] = React.useState('all');
  const sedesList = activeSede === 'all' ? SEDES : SEDES.filter(s => s.id === activeSede);

  return (
    <>
      <SedeTabs active={activeSede} onChange={setActiveSede}/>
      <section style={{ background: '#fff', paddingBottom: 40 }}>
        {sedesList.map((sede, sedeIdx) => {
          const rooms = ROOMS.filter(r => r.sede === sede.id);
          return (
            <div key={sede.id} id={`sede-${sede.id}`} style={{ padding: '24px 48px', borderTop: '1px solid var(--line)' }}>
              <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                {/* Sede header compacto */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Sede {String(sedeIdx + 1).padStart(2, '0')} — {sede.region}
                    </div>
                    <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                      Hs Sol Caribe {sede.short}
                      <span style={{ color: 'var(--text-soft)', fontWeight: 400, marginLeft: 10 }}>· {sede.city}</span>
                    </h2>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Stars count={5} size={12}/>
                        <span style={{ fontWeight: 600 }}>{sede.rating}</span>
                        <span style={{ color: 'var(--text-soft)' }}>· {sede.reviews} reseñas</span>
                      </div>
                      <Sep/>
                      <span style={{ color: 'var(--text-soft)' }}>{sede.address}</span>
                    </div>
                  </div>
                  <a onClick={() => onSedeClick(sede.id)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--mar)', cursor: 'pointer' }} className="ch-link">
                    Ver detalle de esta sede →
                  </a>
                </div>

                {/* Room rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {rooms.map((room, idx) => (
                    <RoomRowChoice key={room.id} room={room} sede={sede}
                      onClick={() => onRoomClick(room.id)} urgentCount={idx === 0 ? 3 : idx === 1 ? 1 : null}/>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

// Row individual estilo Radisson: imagen izquierda, datos medio, precio+CTA derecha
function RoomRowChoice({ room, sede, onClick, urgentCount }) {
  // Amenidades visibles (ícono + label)
  const visibleAmen = (room.amenities || []).slice(0, 6);
  const gallery = room.gallery && room.gallery.length > 1 ? room.gallery : [room.img];
  return (
    <article className="ch-card-lift" style={{
      display: 'grid', gridTemplateColumns: '320px 1fr 260px',
      gap: 24, border: '1px solid var(--line)', borderRadius: 6,
      overflow: 'hidden', background: '#fff',
    }}>
      {/* Carrusel de fotos */}
      <div style={{ minHeight: 240, position: 'relative' }}>
        <PhotoCarousel
          images={gallery}
          alt={room.name}
          height="100%"
          showDots={true}
          showArrows={true}
          onClick={onClick}
        />
      </div>

      {/* Middle — datos de la habitación */}
      <div style={{ padding: '20px 10px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div>
          <h3 onClick={onClick} style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--ink)', cursor: 'pointer', letterSpacing: '-0.01em' }}>
            {room.name}
          </h3>
          <div style={{ marginTop: 10, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'var(--text)' }}>
            <div className="ch-amen">
              <AmenIcon name="guest" size={15}/>
              <a className="ch-link" style={{ color: 'var(--mar)' }}>{room.capacity} {room.capacity === 1 ? 'huésped' : 'huéspedes'}</a>
            </div>
            <div className="ch-amen">
              <AmenIcon name="smoke" size={15}/>
              Prohibido fumar
            </div>
            <div className="ch-amen" style={{ color: 'var(--text-soft)' }}>
              · {room.size} m² · {room.view}
            </div>
          </div>
        </div>

        {/* Amenidades en 3 columnas */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 18px' }}>
          {visibleAmen.map((a, i) => (
            <div key={i} className="ch-amen">
              <AmenIcon name={amenityIcon(a)} size={15}/>
              {a}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <a onClick={onClick} className="ch-link" style={{ fontSize: 13, fontWeight: 600, color: 'var(--mar)' }}>
            Detalles de habitación
          </a>
        </div>
      </div>

      {/* Right — urgencia + precio + CTA */}
      <div style={{
        padding: 20, borderLeft: '1px solid var(--line-soft)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14,
      }}>
        <div style={{ textAlign: 'right', width: '100%' }}>
          {urgentCount && (
            <div style={{ marginBottom: 10 }}>
              <span className="ch-badge-urgent">
                {urgentCount} {urgentCount === 1 ? 'HABITACIÓN RESTANTE' : 'HABITACIONES RESTANTES'} A ESTE PRECIO
              </span>
            </div>
          )}
          <div>
            <span className="ch-price-strike">{formatCOP(Math.round(room.price * 1.25))}</span>
            <span className="ch-price">{formatCOP(room.price)}</span>
            <div className="ch-price-unit" style={{ marginTop: 2 }}>PEN/noche</div>
          </div>
          <div style={{ marginTop: 6 }}>
            <a className="ch-link" style={{ fontSize: 12, color: 'var(--mar)', fontWeight: 500 }}>Tarifa para socios</a>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>{formatCOP(Math.round(room.price * 1.08))} total</div>
          </div>
        </div>
        <button className="ch-btn cta" onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 14 }}>
          Reservar ahora
        </button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// LEGACY / unused (kept for router compatibility) — will be removed
// ─────────────────────────────────────────────────────────────
function Hero({ onNavigate }) { return <HotelHero onNavigate={onNavigate}/>; }
function HeroCompact({ onNavigate }) { return <HotelHero onNavigate={onNavigate}/>; }
function IntroSection() { return null; }
function LocationSection() { return null; }
function SedesSection() { return null; }

function RoomsPreview({ onNavigate, onRoomClick }) {
  const show = ROOMS.filter(r => r.popular).slice(0, 3);
  return (
    <section style={{ padding: '40px 48px', background: '#fff', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px', color: 'var(--ink)' }}>Habitaciones más populares</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {show.map(r => <RoomCardSmall key={r.id} room={r} onClick={() => onRoomClick(r.id)}/>)}
        </div>
      </div>
    </section>
  );
}

function RoomCardSmall({ room, onClick }) {
  return (
    <article onClick={onClick} style={{ cursor: 'pointer', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
      <div className="ch-img-wrap" style={{ aspectRatio: '4/3', borderRadius: 0 }}><img src={room.img} alt={room.name}/></div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{room.tier}</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '6px 0', color: 'var(--ink)' }}>{room.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div><span className="ch-price" style={{ fontSize: 20 }}>{formatCOP(room.price)}</span><span className="ch-price-unit"> /noche</span></div>
          <button className="ch-btn cta" style={{ padding: '8px 14px', fontSize: 12 }}>Reservar</button>
        </div>
      </div>
    </article>
  );
}

function RoomCard({ room, onClick }) { return <RoomCardSmall room={room} onClick={onClick}/>; }

// ─────────────────────────────────────────────────────────────
// Otras secciones para el nav (Servicios, Testimonios, CTA)
// ─────────────────────────────────────────────────────────────
function AmenitiesSection() {
  return (
    <section style={{ padding: '40px 48px', background: 'var(--cream-2)', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Servicios en todas las sedes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {AMENITIES.map(a => (
            <div key={a.num} style={{ background: '#fff', border: '1px solid var(--line)', padding: 20, borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 700 }}>{a.num}</div>
              <div style={{ fontSize: 16, fontWeight: 700, margin: '8px 0', color: 'var(--ink)' }}>{a.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const [i, setI] = React.useState(0);
  const current = TESTIMONIALS[i];
  return (
    <section style={{ padding: '50px 48px', background: '#fff', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Stars count={5} size={16}/>
          <div style={{ fontSize: 18, fontWeight: 700 }}>4.8</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>· 2,019 reseñas</div>
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.6, color: 'var(--ink)', marginBottom: 16 }}>
          &ldquo;{current.text}&rdquo;
        </div>
        <div style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 600 }}>{current.author}</span>
          <span style={{ color: 'var(--text-soft)', marginLeft: 10 }}>· {current.where}</span>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          {TESTIMONIALS.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)}
              style={{ width: 28, height: 3, border: 'none', padding: 0, cursor: 'pointer',
                background: idx === i ? 'var(--navy)' : 'var(--line)' }}/>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onNavigate }) {
  return (
    <section style={{ padding: '50px 48px', background: 'var(--navy)', color: '#fff' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Reserva directo y ahorra 10%
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, maxWidth: 560, margin: '14px auto 0' }}>
          Mejor precio garantizado. Desayuno incluido. Cancelación gratis hasta 72h antes, en cualquiera de nuestras cuatro sedes.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="ch-btn cta" onClick={() => onNavigate('booking')} style={{ padding: '14px 28px' }}>
            Reservar ahora
          </button>
          <button onClick={() => onNavigate('sedes')} style={{
            background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
            padding: '14px 28px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}>
            Ver sedes
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SedePage — detalle de sede estilo Radisson
// ─────────────────────────────────────────────────────────────
function SedePage({ sedeId, onRoomClick, onNavigate }) {
  const sede = SEDES.find(s => s.id === sedeId);
  if (!sede) return null;
  const rooms = ROOMS.filter(r => r.sede === sedeId);

  return (
    <div style={{ background: '#fff' }}>
      {/* Hero images */}
      <div style={{ position: 'relative', height: 340, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 4 }}>
          <div className="ch-img-wrap" style={{ borderRadius: 0 }}><img src={sede.cover} alt=""/></div>
          <div className="ch-img-wrap" style={{ borderRadius: 0 }}><img src={sede.img} alt=""/></div>
          <div className="ch-img-wrap" style={{ borderRadius: 0 }}><img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80" alt=""/></div>
        </div>
      </div>

      {/* Hotel header */}
      <section style={{ padding: '26px 48px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: 30 }}>
          <div>
            <a onClick={() => onNavigate('home')} className="ch-link" style={{ fontSize: 12, color: 'var(--mar)', marginBottom: 10, display: 'inline-block' }}>
              ← Ver todas las sedes
            </a>
            <div style={{ marginBottom: 10 }}><span className="ch-badge-brand">VENTA RÁPIDA</span></div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Hs Sol Caribe <span style={{ color: 'var(--terracotta)' }}>{sede.short}</span>
            </h1>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stars count={5} size={13}/>
                <span style={{ fontWeight: 700 }}>{sede.rating}</span>
                <span style={{ color: 'var(--text-soft)' }}>{sede.reviews} reseñas</span>
              </div>
              <Sep/>
              <span>📍 {sede.address}</span>
              <Sep/>
              <span>📞 +57 305 · 284 · 9123</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>
              <span className="ch-price-strike">{formatCOP(Math.round(sede.priceFrom * 1.25))}</span>
              <span className="ch-price">{formatCOP(sede.priceFrom)}</span>
              <span className="ch-price-unit"> PEN/noche</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>Tarifa para socios</div>
            <button className="ch-btn cta" style={{ marginTop: 12 }}>Ver las habitaciones</button>
          </div>
        </div>
      </section>

      <BenefitBanner/>

      {/* Descripción */}
      <section style={{ padding: '28px 48px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>Sobre esta sede</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>{sede.desc}</p>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>Lo destacado</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {sede.features.map(f => (
                <div key={f} className="ch-amen" style={{ fontSize: 13 }}>
                  <AmenIcon name={amenityIcon(f)} size={15}/>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section style={{ padding: '24px 48px 60px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>
            {rooms.length} habitaciones disponibles en {sede.short}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {rooms.map((r, i) => <RoomRowChoice key={r.id} room={r} sede={sede}
              onClick={() => onRoomClick(r.id)} urgentCount={i === 0 ? 2 : null}/>)}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SedesPage — lista de sedes estilo "Ver todos los hoteles"
// ─────────────────────────────────────────────────────────────
function SedesPage({ onSedeClick }) {
  return (
    <div style={{ background: 'var(--cream-2)', minHeight: '80vh' }}>
      <section style={{ padding: '30px 48px 20px', background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Hs Sol Caribe</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Todos los hoteles <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>· 4 sedes · Caribe colombiano</span>
          </h1>
        </div>
      </section>
      <section style={{ padding: '24px 48px 60px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SEDES.map(s => <SedeRow key={s.id} sede={s} onClick={() => onSedeClick(s.id)}/>)}
        </div>
      </section>
    </div>
  );
}

function SedeRow({ sede, onClick }) {
  const gallery = sede.gallery && sede.gallery.length > 1 ? sede.gallery : [sede.img, sede.cover].filter(Boolean);
  return (
    <article className="ch-card-lift" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 260px',
      gap: 24, border: '1px solid var(--line)', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
      <div style={{ minHeight: 220, position: 'relative' }}>
        <PhotoCarousel images={gallery} alt={sede.name} height="100%" onClick={onClick}/>
      </div>
      <div style={{ padding: '20px 10px 20px 0' }}>
        <div style={{ marginBottom: 8 }}><span className="ch-badge-brand">VENTA RÁPIDA DEL HOTEL</span></div>
        <h3 onClick={onClick} style={{ fontSize: 22, fontWeight: 700, margin: 0, cursor: 'pointer', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Hs Sol Caribe {sede.short}
        </h3>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Stars count={5} size={12}/>
            <span style={{ fontWeight: 600 }}>{sede.rating}</span>
            <span style={{ color: 'var(--text-soft)' }}>· {sede.reviews} reseñas</span>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-soft)' }}>📍 {sede.address}</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', marginTop: 10, marginBottom: 0 }}>{sede.desc}</p>
        <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {sede.features.slice(0, 4).map(f => (
            <div key={f} className="ch-amen" style={{ fontSize: 12 }}>
              <AmenIcon name={amenityIcon(f)} size={13}/>{f}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 20, borderLeft: '1px solid var(--line-soft)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Desde</div>
          <div>
            <span className="ch-price-strike">{formatCOP(Math.round(sede.priceFrom * 1.25))}</span>
            <span className="ch-price">{formatCOP(sede.priceFrom)}</span>
          </div>
          <div className="ch-price-unit">PEN/noche · {sede.roomCount} habitaciones</div>
        </div>
        <button className="ch-btn cta" onClick={onClick}
          style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14 }}>
          Ver las habitaciones
        </button>
      </div>
    </article>
  );
}

function SedeCard({ sede, onClick }) { return <SedeRow sede={sede} onClick={onClick}/>; }

Object.assign(window, {
  Hero, HotelHero, HeroCompact, BenefitBanner, SedeTabs,
  IntroSection, RoomsPreview, RoomCard, AmenitiesSection, TestimonialsSection,
  LocationSection, CTASection, SedesSection, SedeCard, SedePage, SedesPage, RoomsBySede,
  AmenIcon, Sep, RoomRowChoice,
});
