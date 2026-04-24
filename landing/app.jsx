// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — router principal
// ─────────────────────────────────────────────────────────────

// Splash loader: reproduce assets/inicio.mp4 fullscreen al cargar.
// Con forceShow=true se muestra SIEMPRE (ignorando sessionStorage).
// Fade-out al terminar el video o al pasar 10s como máximo.
// Click/tecla después del primer segundo = saltarlo.
function SplashLoader({ forceShow, onDone }) {
  const shouldShow = (() => {
    if (forceShow) return true;
    try { return !sessionStorage.getItem('splash-seen'); } catch { return true; }
  })();

  const [fading, setFading] = React.useState(false);
  const [hidden, setHidden] = React.useState(!shouldShow);
  const videoRef = React.useRef(null);
  const canSkipRef = React.useRef(false);

  React.useEffect(() => {
    if (!shouldShow) return;
    try { sessionStorage.setItem('splash-seen', '1'); } catch {}

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Permitir skip recién después de 1s (así no se salta solo por un click del botón)
    const enableSkip = setTimeout(() => { canSkipRef.current = true; }, 1000);

    // Timeout de seguridad aumentado a 10s (por si la red es lenta)
    const safety = setTimeout(() => triggerFade(), 10000);

    const skip = () => { if (canSkipRef.current) triggerFade(); };
    window.addEventListener('click', skip);
    window.addEventListener('keydown', skip);

    return () => {
      clearTimeout(safety);
      clearTimeout(enableSkip);
      window.removeEventListener('click', skip);
      window.removeEventListener('keydown', skip);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceShow]);

  const triggerFade = () => {
    if (fading) return;
    setFading(true);
    document.body.style.overflow = '';
    setTimeout(() => {
      setHidden(true);
      if (onDone) onDone();
    }, 850);
  };

  if (hidden) return null;

  return (
    <div className={`ed-splash ${fading ? 'fading' : ''}`}>
      <video
        ref={videoRef}
        src="assets/inicio.mp4"
        autoPlay muted playsInline
        preload="auto"
        onEnded={triggerFade}
        onError={() => triggerFade()}
        className="ed-splash-video"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

// SEO dinámico — actualiza <title>, <meta description> y <link canonical>
// según la sección activa. Ejecutado desde dentro del router principal.
const SEO_BY_SECTION = {
  home: {
    title: 'Hs Sol Caribe — Hotel · Tu hogar fuera de casa',
    description: 'Hospedaje cómodo, limpio y con atención cercana. Habitaciones con WiFi, TV y baño privado. Reserva directa al mejor precio.',
    path: '/',
  },
  rooms: {
    title: 'Habitaciones — Hs Sol Caribe',
    description: 'Habitaciones cómodas con WiFi, TV, baño privado y agua caliente. Fotos, precios y disponibilidad.',
    path: '/habitaciones',
  },
  sedes: {
    title: 'Sedes — Hs Sol Caribe',
    description: 'Conoce nuestras sedes. Ubicación, habitaciones disponibles y detalles de cada una.',
    path: '/sedes',
  },
  sede: {
    title: 'Sede — Hs Sol Caribe',
    description: 'Detalle de la sede Sol Caribe: fotos, habitaciones y precios.',
    path: '/sede',
  },
  room: {
    title: 'Habitación — Hs Sol Caribe',
    description: 'Detalle de la habitación: fotos, características y precio por noche.',
    path: '/habitacion',
  },
  amenities: {
    title: 'Servicios — Hs Sol Caribe',
    description: 'WiFi gratis, TV por cable, agua caliente 24h, recepción 24/7 y limpieza diaria.',
    path: '/servicios',
  },
  gallery: {
    title: 'Galería — Hs Sol Caribe',
    description: 'Fotos y videos del hotel: habitaciones, áreas comunes y recepción.',
    path: '/galeria',
  },
  contact: {
    title: 'Contacto — Hs Sol Caribe',
    description: 'Comunícate con nosotros por teléfono, WhatsApp o email. Atención 24/7.',
    path: '/contacto',
  },
  booking: {
    title: 'Reserva — Hs Sol Caribe',
    description: 'Completa tu reserva con mejor precio garantizado.',
    path: '/reserva',
  },
  confirmed: {
    title: 'Reserva confirmada — Hs Sol Caribe',
    description: 'Tu reserva fue confirmada. Gracias por elegirnos.',
    path: '/confirmada',
  },
};

function applySEO(section, extra) {
  const cfg = SEO_BY_SECTION[section] || SEO_BY_SECTION.home;
  const title = extra?.title || cfg.title;
  const description = extra?.description || cfg.description;
  const path = extra?.path || cfg.path;

  document.title = title;

  const setMeta = (selector, attr, content) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, content);
  };
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', `https://caribeperu.com${path}`);
  setMeta('meta[property="og:url"]', 'content', `https://caribeperu.com${path}`);
}

// Observer global para elementos [data-reveal] — se activan al entrar en viewport
function useScrollReveal() {
  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-inview'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

    const attach = () => {
      document.querySelectorAll('[data-reveal]:not(.is-inview)').forEach((el) => io.observe(el));
    };
    attach();
    // Re-escanear cuando el DOM cambie (cambios de sección)
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

function VariationB({ onNavigateExternal }) {
  const [section, setSection] = React.useState('home');
  const [roomId, setRoomId] = React.useState(null);
  const [sedeId, setSedeId] = React.useState(null);
  const [booking, setBooking] = React.useState(null);
  const [liveData, setLiveData] = React.useState({ loaded: false });
  const [splashKey, setSplashKey] = React.useState(0);          // incrementa para re-montar
  const [splashForce, setSplashForce] = React.useState(false);  // true = ignorar sessionStorage
  useScrollReveal();

  const replaySplash = () => {
    try { sessionStorage.removeItem('splash-seen'); } catch {}
    setSplashForce(true);
    setSplashKey((k) => k + 1);
  };

  // Cargar datos reales desde el backend (sedes + habitaciones con fotos)
  React.useEffect(() => {
    fetch('/api/public/landing')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        // Muta los arrays globales para que los componentes usen data real
        if (Array.isArray(data?.rooms) && data.rooms.length > 0) {
          window.ROOMS.length = 0;
          data.rooms.forEach((r) => window.ROOMS.push(r));
        }
        if (Array.isArray(data?.sedes) && data.sedes.length > 0) {
          window.SEDES.length = 0;
          data.sedes.forEach((s) => window.SEDES.push(s));
        }
        setLiveData({ loaded: true, ok: true });
      })
      .catch((err) => {
        // Si falla (backend caído o primera instalación sin datos),
        // la landing sigue funcionando con los datos mock de data.jsx
        console.warn('Landing API fallback:', err);
        setLiveData({ loaded: true, ok: false });
      });
  }, []);

  const go = (s, payload) => {
    if (s === 'room' && payload) { setRoomId(payload); setSection('room'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (s === 'sede' && payload) { setSedeId(payload); setSection('sede'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSection(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // SEO: actualiza <title>, description, canonical cada vez que cambia la sección.
  // Para 'sede' y 'room' resolvemos el nombre real desde los datos.
  React.useEffect(() => {
    if (section === 'sede' && sedeId && window.SEDES) {
      const sede = window.SEDES.find((s) => s.id === sedeId);
      if (sede) {
        applySEO('sede', {
          title: `${sede.name} — Hs Sol Caribe · Sede ${sede.short || ''}`,
          description: sede.desc
            ? `${sede.desc} Reserva directa en Hs Sol Caribe.`
            : `Sede ${sede.name} de Hs Sol Caribe: habitaciones, amenidades y precios.`,
          path: `/sede/${sede.id}`,
        });
        return;
      }
    }
    if (section === 'room' && roomId && window.ROOMS) {
      const room = window.ROOMS.find((r) => r.id === roomId);
      if (room) {
        applySEO('room', {
          title: `${room.name} — Hs Sol Caribe · Habitación #${room.num}`,
          description: room.desc
            ? `${room.desc}`
            : `Habitación ${room.name} en Hs Sol Caribe. ${room.capacity || 2} huéspedes, ${room.beds || 'cama doble'}.`,
          path: `/habitacion/${room.id}`,
        });
        return;
      }
    }
    applySEO(section);
  }, [section, sedeId, roomId, liveData.loaded]);

  return (
    <div className="ch-root ed-page" style={{ minHeight: '100%' }}>
      <SplashLoader key={splashKey} forceShow={splashForce}/>
      <button
        type="button"
        className="ed-splash-replay"
        onClick={replaySplash}
        title="Reproducir intro"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Ver intro
      </button>
      <Nav current={section} onNavigate={(s) => go(s)} />
      {section === 'home' && (
        <>
          <HotelHero onNavigate={go}/>
          <div id="habitaciones" className="ed-chapter" data-reveal>
            <div className="ed-chapter-num">Capítulo 02 · Habitaciones</div>
            <h2>Cada sede, <em>un carácter</em>.</h2>
          </div>
          <RoomsBySede onRoomClick={(id) => go('room', id)} onSedeClick={(id) => go('sede', id)}/>
          <ReviewsSection/>
          <CTASection onNavigate={go}/>
        </>
      )}
      {section === 'sedes' && <SedesPage onSedeClick={(id) => go('sede', id)}/>}
      {section === 'sede' && <SedePage sedeId={sedeId} onRoomClick={(id) => go('room', id)} onNavigate={go}/>}
      {section === 'rooms' && <RoomsListPage onRoomClick={(id) => go('room', id)} onNavigate={go} onSedeClick={(id) => go('sede', id)}/>}
      {section === 'room' && <RoomDetailPage roomId={roomId} onBack={() => go('rooms')} onBook={(id) => { setRoomId(id); go('booking'); }} onSedeClick={(id) => go('sede', id)}/>}
      {section === 'amenities' && <AmenitiesPage onNavigate={go}/>}
      {section === 'gallery' && <GalleryPage/>}
      {section === 'contact' && <ContactPage/>}
      {section === 'booking' && <BookingFlow preselectedRoom={roomId} onDone={(b) => { setBooking(b); go('confirmed'); }}/>}
      {section === 'confirmed' && <BookingConfirmed booking={booking} onHome={() => go('home')}/>}
      <Footer/>
      <WhatsAppFab/>
    </div>
  );
}

Object.assign(window, { VariationB });
