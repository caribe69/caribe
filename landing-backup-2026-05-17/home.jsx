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
const HERO_VIDEOS = [
  { src: 'assets/caribevideo.mp4',  num: '01', label: 'En vivo · Cartagena' },
  { src: 'assets/presentacion2.mp4', num: '02', label: 'Interiores · Rodadero' },
  { src: 'assets/decoracion.mp4',    num: '03', label: 'Decoración · Minca' },
];

function VideoCarousel({ videos, interval = 5000 }) {
  const [idx, setIdx] = React.useState(0);
  const refs = React.useRef([]);

  // Rotación automática
  React.useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % videos.length), interval);
    return () => clearInterval(id);
  }, [videos.length, interval]);

  // Cada vez que cambia el índice activo:
  //  - el video activo vuelve al segundo 0 y se reproduce desde ahí
  //  - los demás se pausan (ahorra CPU y evita que corran simultáneamente)
  React.useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return;
      if (i === idx) {
        try {
          v.currentTime = 0;
          const p = v.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {}
      } else {
        try {
          v.pause();
          // También bajamos el cursor al inicio para que el próximo "entrar" no muestre un frame cacheado
          v.currentTime = 0;
        } catch (_) {}
      }
    });
  }, [idx]);

  return (
    <div className="ed-vcarousel">
      {videos.map((v, i) => (
        <video
          key={v.src}
          ref={(el) => { refs.current[i] = el; }}
          src={v.src}
          muted
          playsInline
          preload="auto"
          className={`ed-vcarousel-slide ${i === idx ? 'active' : ''}`}
        />
      ))}
      {/* Label del slide activo — re-renderiza con key para relanzar animación */}
      <div className="ed-vcarousel-label" key={idx}>
        <span className="ed-vcarousel-label-num">{videos[idx].num} · {videos.length}</span>
        <div className="ed-vcarousel-label-title">{videos[idx].label}</div>
      </div>
      {/* Progress ticks + click to jump */}
      <div className="ed-vcarousel-progress">
        {videos.map((_, i) => (
          <button
            key={i}
            className={`ed-vcarousel-tick ${i === idx ? 'active' : (i < idx ? 'done' : '')}`}
            onClick={() => setIdx(i)}
            aria-label={`Video ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function HotelHero({ onNavigate }) {
  const sedes = (typeof window !== 'undefined' && window.SEDES) || [];
  const rooms = (typeof window !== 'undefined' && window.ROOMS) || [];
  const nSedes = sedes.length;
  const nRooms = rooms.length;
  const priceMin = rooms.length
    ? Math.min(...rooms.map(r => Number(r.price || r.precioNoche || 0)).filter(p => p > 0))
    : 0;
  const sedesList = sedes.map(s => s.short || s.name).filter(Boolean).join(' · ');

  return (
    <>
      {/* Hero editorial asimétrico: carrusel de 3 videos (crossfade 5s) + tarjeta */}
      <section className="ed-hero">
        <div className="ed-hero-grid">
          <div className="ed-hero-video-wrap" style={{ position: 'relative' }}>
            <VideoCarousel videos={HERO_VIDEOS} interval={5000}/>
            <span className="ed-hero-live">En vivo · Tour del hotel</span>
          </div>
          <div className="ed-hero-card">
            <div className="ed-hero-intro-video">
              <video
                src="assets/inicio.mp4"
                autoPlay muted loop playsInline preload="auto"
              />
            </div>
            <div className="ed-hero-meta">
              <span className="ed-number">01</span>
              <span className="ed-eyebrow">Hs Sol Caribe · Hospedaje</span>
            </div>
            <h1 className="ed-hero-title">
              Tu hogar<br/>
              <em>fuera de casa.</em>
            </h1>
            <p className="ed-hero-sub">
              {nSedes > 0
                ? `${nSedes} sede${nSedes === 1 ? '' : 's'} con ${nRooms} habitacion${nRooms === 1 ? '' : 'es'}. ${sedesList || ''}`
                : 'Habitaciones cómodas, limpias y bien ubicadas. Atención cercana y el trato de siempre.'}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button
                className="ed-btn ed-btn-dark"
                onClick={() => {
                  const el = document.getElementById('habitaciones');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  else onNavigate('rooms');
                }}
              >
                Ver habitaciones
                <svg className="ed-btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
              {nSedes > 1 && (
                <button className="ed-btn ed-btn-outline" onClick={() => onNavigate('sedes')}>
                  Explorar sedes
                </button>
              )}
            </div>
            <div className="ed-hero-stats">
              <div className="ed-hero-stat">
                <div className="ed-hero-stat-n">{String(nSedes).padStart(2, '0')}</div>
                <div className="ed-hero-stat-l">{nSedes === 1 ? 'Sede' : 'Sedes'}</div>
              </div>
              <div className="ed-hero-stat">
                <div className="ed-hero-stat-n">{String(nRooms).padStart(2, '0')}</div>
                <div className="ed-hero-stat-l">{nRooms === 1 ? 'Habitación' : 'Habitaciones'}</div>
              </div>
              {priceMin > 0 && (
                <div className="ed-hero-stat">
                  <div className="ed-hero-stat-n">S/<span style={{ fontSize: 18, color: 'var(--ed-gold)' }}> {priceMin}</span></div>
                  <div className="ed-hero-stat-l">Desde</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Marquee editorial — las sedes reales del backend */}
      {sedes.length > 0 && (
      <div className="ed-marquee">
        <div className="ed-marquee-track">
          {[...sedes, ...sedes, ...sedes].map((s, i) => (
            <span key={i}>{s.short || s.name}</span>
          ))}
        </div>
      </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SedesShowcase — las 4 sedes rotando con entrada/salida cinemática
// ─────────────────────────────────────────────────────────────
function SedesShowcase({ onSedeClick }) {
  const sedes = (typeof window !== 'undefined' && window.SEDES) ? window.SEDES : [];
  const [idx, setIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('enter'); // 'enter' | 'exit'

  // Auto-rotate: cada 6s, exit → cambio → enter
  React.useEffect(() => {
    if (sedes.length === 0) return;
    const EXIT_MS = 600;
    const TOTAL_MS = 6500;
    const t1 = setTimeout(() => setPhase('exit'), TOTAL_MS - EXIT_MS);
    const t2 = setTimeout(() => {
      setIdx((i) => (i + 1) % sedes.length);
      setPhase('enter');
    }, TOTAL_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [idx, sedes.length]);

  const go = (i) => {
    if (i === idx) return;
    setPhase('exit');
    setTimeout(() => { setIdx(i); setPhase('enter'); }, 500);
  };

  if (sedes.length === 0) return null;
  const sede = sedes[idx];

  return (
    <section className="ed-sedes-show">
      <div className="ed-sedes-show-inner">
        <div className={`ed-sedes-show-text ${phase}`} key={`text-${idx}-${phase}`}>
          <div className="ed-sedes-show-pillnum">Capítulo 03 · Sedes</div>
          <div className="ed-sedes-show-eyebrow">
            Destino 0{idx + 1} de 0{sedes.length}
          </div>
          <h2 className="ed-sedes-show-h">
            {sede.name?.split(' ')[0] || sede.short}
            <em> {sede.name?.split(' ').slice(1).join(' ') || sede.city || ''}</em>
          </h2>
          <p className="ed-sedes-show-desc">
            {sede.desc || `Sede ${sede.short || sede.name} · ${sede.roomCount || 0} habitación${sede.roomCount === 1 ? '' : 'es'} listas para recibirte.`}
          </p>
          <div className="ed-sedes-show-stats">
            <div>
              <div className="ed-sedes-show-stat-n">{sede.roomCount || 0}</div>
              <div className="ed-sedes-show-stat-l">Habitaciones</div>
            </div>
            <div>
              <div className="ed-sedes-show-stat-n">{sede.rating ? sede.rating.toFixed(1) : '4.8'}<span style={{fontSize: 16, color: 'var(--ed-gold)'}}> ★</span></div>
              <div className="ed-sedes-show-stat-l">Rating</div>
            </div>
            <div>
              <div className="ed-sedes-show-stat-n">S/ {sede.priceFrom || '—'}</div>
              <div className="ed-sedes-show-stat-l">Desde</div>
            </div>
          </div>
          <button className="ed-btn ed-btn-light" onClick={() => onSedeClick && onSedeClick(sede.id)}>
            Ver sede {sede.short}
            <svg className="ed-btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
        <div className={`ed-sedes-show-img-wrap ${phase}`} key={`img-${idx}-${phase}`}>
          <img className="ed-sedes-show-img" src={sede.cover || sede.img} alt={sede.name}/>
        </div>
      </div>
      <div className="ed-sedes-show-nav">
        {sedes.map((s, i) => (
          <button
            key={s.id || i}
            className={`ed-sedes-show-nav-item ${i === idx ? 'active' : ''}`}
            onClick={() => go(i)}
          >
            <div className="ed-sedes-show-nav-num">0{i + 1}</div>
            <div className="ed-sedes-show-nav-name">{s.short || s.name}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// ReviewsSection — testimonios con estrellas, estilo editorial
// ─────────────────────────────────────────────────────────────
const REVIEWS = [
  {
    name: 'Anthony N.',
    initials: 'AN',
    location: 'Lima',
    date: '2026',
    rating: 5,
    text: 'Muy buena ubicación, habitación limpia y cómoda. La atención del personal fue excelente, muy atentos en todo momento.',
    sede: 'Sol Caribe',
  },
  {
    name: 'María G.',
    initials: 'MG',
    location: 'Arequipa',
    date: '2026',
    rating: 5,
    text: 'Cama cómoda, buena ducha y precio justo. Volvería sin dudarlo. Recomendado para quienes buscan descansar tranquilos.',
    sede: 'Sol Caribe',
  },
  {
    name: 'Carlos R.',
    initials: 'CR',
    location: 'Cusco',
    date: '2026',
    rating: 5,
    text: 'Todo en orden desde el check-in hasta el check-out. Habitación silenciosa, buena señal de WiFi y trato cordial.',
    sede: 'Sol Caribe',
  },
];

function ReviewsSection() {
  const [idx, setIdx] = React.useState(0);

  // Auto-rotate cada 7s
  React.useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % REVIEWS.length), 7000);
    return () => clearInterval(id);
  }, []);

  const r = REVIEWS[idx];

  return (
    <section className="ed-section" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }} data-reveal>
        <div className="ed-eyebrow" style={{ marginBottom: 14 }}>Testimonios · 04</div>
        <h2 className="ed-display" style={{ fontSize: 'clamp(36px, 4.2vw, 62px)', margin: 0 }}>
          Historias de <em style={{ fontStyle: 'italic', color: 'var(--ed-gold)' }}>huéspedes</em> reales.
        </h2>
      </div>

      <div className="ed-quote" data-reveal data-reveal-delay="1" key={idx}>
        <span className="ed-quote-mark">"</span>
        <blockquote className="ed-quote-body">
          {r.text}
        </blockquote>
        <div style={{ display: 'inline-flex', gap: 4, marginBottom: 14 }}>
          {[...Array(r.rating)].map((_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="var(--ed-gold)">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
            </svg>
          ))}
        </div>
        <div className="ed-quote-author">{r.name}</div>
        <div className="ed-quote-author-sub">{r.location} · {r.date} · {r.sede}</div>
        <div className="ed-quote-dots">
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              className={`ed-quote-dot ${i === idx ? 'active' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Reseña ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Sep() {
  return <span style={{ color: 'var(--line)' }}>·</span>;
}

// ─────────────────────────────────────────────────────────────
// BenefitBanner — "Los socios ahorran 10%"
// ─────────────────────────────────────────────────────────────
function BenefitBanner() {
  const benefits = [
    {
      num: '01',
      title: 'Socios ahorran 10%',
      body: 'Regístrate gratis en el club Sol Caribe y accede a tarifas exclusivas permanentes en nuestras cuatro sedes.',
    },
    {
      num: '02',
      title: 'Puntos por cada noche',
      body: 'Gana puntos canjeables en restaurantes, tours y upgrades. Hasta 1,080 puntos por estadía completa.',
    },
    {
      num: '03',
      title: 'Desayuno incluido',
      body: 'Buffet tropical con frutas frescas, pan recién horneado y café colombiano en todas las sedes.',
    },
  ];

  return (
    <section className="ed-benefits">
      <div className="ed-benefits-grid">
        {benefits.map((b, i) => (
          <div key={b.num} className="ed-benefit" data-reveal data-reveal-delay={String(i + 1)}>
            <span className="ed-benefit-num">{b.num} · Ventaja</span>
            <h3>{b.title}</h3>
            <p>{b.body}</p>
          </div>
        ))}
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
    <section className="ed-cta-bleed">
      <div className="ed-cta-bleed-bg">
        <video
          src="assets/caribevideo.mp4"
          autoPlay muted loop playsInline preload="auto"
        />
      </div>
      <div className="ed-cta-bleed-inner" data-reveal>
        <div className="ed-eyebrow" style={{ color: 'var(--ed-gold-soft)', marginBottom: 20 }}>
          Reserva directa · 10% descuento
        </div>
        <h2>
          Tu <em>Caribe</em> empieza<br/>con una sola llamada.
        </h2>
        <p>
          Mejor precio garantizado · Desayuno incluido · Cancelación
          gratis hasta 72h antes · Cuatro sedes, una misma calidez.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="ed-btn ed-btn-gold" onClick={() => onNavigate('rooms')}>
            Reservar ahora
            <svg className="ed-btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
          <button className="ed-btn ed-btn-light" onClick={() => onNavigate('sedes')}
            style={{ background: 'transparent', color: 'var(--ed-ivory)', borderColor: 'rgba(255,255,255,0.5)' }}>
            Ver las 4 sedes
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="pin" size={12}/> {sede.address}
              </span>
              {sede.telefono && (
                <>
                  <Sep/>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="phone" size={12}/> {sede.telefono}
                  </span>
                </>
              )}
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
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-soft)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="pin" size={13}/> {sede.address}
        </div>
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
  AmenIcon, Sep, RoomRowChoice, ReviewsSection, SedesShowcase, VideoCarousel,
});
