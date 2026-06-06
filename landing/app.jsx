// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — router principal (Sol Caribe Premium look)
// ─────────────────────────────────────────────────────────────

// SEO dinámico — actualiza <title>, <meta description> y <link canonical>
// según la sección activa.
const SEO_BY_SECTION = {
  home:      { title: 'Hs Sol Caribe — Hotel · Tu hogar fuera de casa',          description: 'Hospedaje cómodo, limpio y con atención cercana. Habitaciones con WiFi, TV y baño privado. Reserva directa al mejor precio.', path: '/' },
  rooms:     { title: 'Habitaciones — Hs Sol Caribe',                            description: 'Habitaciones cómodas con WiFi, TV, baño privado y agua caliente. Fotos, precios y disponibilidad.',                       path: '/habitaciones' },
  sedes:     { title: 'Sedes — Hs Sol Caribe',                                   description: 'Conoce nuestras sedes. Ubicación, habitaciones disponibles y detalles de cada una.',                                    path: '/sedes' },
  sede:      { title: 'Sede — Hs Sol Caribe',                                    description: 'Detalle de la sede Sol Caribe: fotos, habitaciones y precios.',                                                         path: '/sede' },
  room:      { title: 'Habitación — Hs Sol Caribe',                              description: 'Detalle de la habitación: fotos, características y precio por noche.',                                                  path: '/habitacion' },
  amenities: { title: 'Servicios — Hs Sol Caribe',                               description: 'WiFi gratis, TV por cable, agua caliente 24h, recepción 24/7 y limpieza diaria.',                                       path: '/servicios' },
  gallery:   { title: 'Galería — Hs Sol Caribe',                                 description: 'Fotos y videos del hotel: habitaciones, áreas comunes y recepción.',                                                     path: '/galeria' },
  contact:   { title: 'Contacto — Hs Sol Caribe',                                description: 'Comunícate con nosotros por teléfono, WhatsApp o email. Atención 24/7.',                                                path: '/contacto' },
  booking:   { title: 'Reserva — Hs Sol Caribe',                                 description: 'Completa tu reserva con mejor precio garantizado.',                                                                    path: '/reserva' },
  confirmed: { title: 'Reserva confirmada — Hs Sol Caribe',                      description: 'Tu reserva fue confirmada. Gracias por elegirnos.',                                                                    path: '/confirmada' },
};

function applySEO(section, extra) {
  const cfg = SEO_BY_SECTION[section] || SEO_BY_SECTION.home;
  const title = (extra && extra.title) || cfg.title;
  const description = (extra && extra.description) || cfg.description;
  const path = (extra && extra.path) || cfg.path;

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

// Observer global para [data-reveal] — se activan al entrar en viewport
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
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

function VariationB() {
  const [section, setSection] = React.useState('home');
  const [roomId, setRoomId] = React.useState(null);
  const [sedeId, setSedeId] = React.useState(null);
  const [booking, setBooking] = React.useState(null);
  const [liveData, setLiveData] = React.useState({ loaded: false });
  useScrollReveal();

  // Cargar datos reales del backend
  React.useEffect(() => {
    fetch('/api/public/landing')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
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
        console.warn('Landing API fallback:', err);
        setLiveData({ loaded: true, ok: false });
      });
  }, []);

  const go = (s, payload) => {
    if (s === 'room' && payload != null) { setRoomId(payload); setSection('room'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (s === 'sede' && payload != null) { setSedeId(payload); setSection('sede'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSection(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Eventos custom desde footer / CTAs anidados
  React.useEffect(() => {
    const handler = (e) => {
      const dest = e.detail;
      if (typeof dest === 'string') go(dest);
    };
    window.addEventListener('hsc:navigate', handler);
    return () => window.removeEventListener('hsc:navigate', handler);
  }, []);

  // SEO
  React.useEffect(() => {
    if (section === 'sede' && sedeId && window.SEDES) {
      const sede = window.SEDES.find((s) => s.id === sedeId);
      if (sede) {
        applySEO('sede', {
          title: `${sede.name} — Hs Sol Caribe`,
          description: sede.desc ? `${sede.desc} Reserva directa en Hs Sol Caribe.` : `Sede ${sede.name} de Hs Sol Caribe.`,
          path: `/sede/${sede.id}`,
        });
        return;
      }
    }
    if (section === 'room' && roomId && window.ROOMS) {
      const room = window.ROOMS.find((r) => r.id === roomId);
      if (room) {
        applySEO('room', {
          title: `${room.name} — Hs Sol Caribe`,
          description: room.desc || `Habitación ${room.name} en Hs Sol Caribe.`,
          path: `/habitacion/${room.id}`,
        });
        return;
      }
    }
    applySEO(section);
  }, [section, sedeId, roomId, liveData.loaded]);

  return (
    <div className="ch-root">
      <Nav current={section} onNavigate={(s) => go(s)} />

      {section === 'home' && (
        <>
          <HotelHero onNavigate={go} />
          <RoomsBySede
            onRoomClick={(id) => go('room', id)}
            onSedeClick={(id) => go('sede', id)}
          />
          <ReviewsSection />
          <CTASection onNavigate={go} />
        </>
      )}

      {section === 'sedes' && typeof SedesPage === 'function' && (
        <SedesPage onSedeClick={(id) => go('sede', id)} />
      )}
      {section === 'sede' && typeof SedePage === 'function' && (
        <SedePage sedeId={sedeId} onRoomClick={(id) => go('room', id)} onNavigate={go} />
      )}
      {section === 'rooms' && (
        <RoomsListPage
          onRoomClick={(id) => go('room', id)}
          onNavigate={go}
          onSedeClick={(id) => go('sede', id)}
        />
      )}
      {section === 'room' && (
        <RoomDetailPage
          roomId={roomId}
          onBack={() => go('rooms')}
          onBook={(id) => { setRoomId(id); go('booking'); }}
          onSedeClick={(id) => go('sede', id)}
        />
      )}
      {section === 'amenities' && typeof AmenitiesPage === 'function' && (
        <AmenitiesPage onNavigate={go} />
      )}
      {section === 'gallery' && typeof GalleryPage === 'function' && (
        <GalleryPage />
      )}
      {section === 'contact' && typeof ContactPage === 'function' && (
        <ContactPage />
      )}
      {section === 'booking' && typeof BookingFlow === 'function' && (
        <BookingFlow preselectedRoom={roomId} onDone={(b) => { setBooking(b); go('confirmed'); }} />
      )}
      {section === 'confirmed' && typeof BookingConfirmed === 'function' && (
        <BookingConfirmed booking={booking} onHome={() => go('home')} />
      )}

      <Footer />
      <WhatsAppFab />
    </div>
  );
}

Object.assign(window, { VariationB });
