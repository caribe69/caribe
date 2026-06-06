// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — Páginas internas (Sol Caribe Premium look)
// SedesPage · SedePage · AmenitiesPage · GalleryPage
// ContactPage · BookingFlow · BookingConfirmed
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SedesPage — listado de todas las sedes
// ─────────────────────────────────────────────────────────────
function SedesPage({ onSedeClick }) {
  const sedes = window.SEDES || [];

  return (
    <>
      <InternalHero
        title="Nuestras Sedes"
        subtitle="Un mismo estándar, distintos lugares"
        image={(sedes[0] && (sedes[0].cover || sedes[0].image)) || 'assets/sol/hero-1.webp'}
      />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 spacing-grid-gap">
            {sedes.length === 0 ? (
              <div className="col-span-full bg-white py-20 border border-slate-200 border-dashed text-center radius-lg">
                <p className="font-medium text-slate-500">Aún no hay sedes publicadas.</p>
              </div>
            ) : (
              sedes.map((s, i) => (
                <a
                  key={s.id || i}
                  onClick={() => onSedeClick(s.id)}
                  className="group relative flex flex-col bg-white shadow-sm hover:shadow-2xl border border-slate-100 overflow-hidden no-underline transition-all duration-500 radius-lg cursor-pointer"
                  data-reveal
                  data-delay={String((i % 3) * 100)}
                >
                  <div className="relative m-3 h-56 overflow-hidden radius-default">
                    {(s.cover || s.image) ? (
                      <img
                        src={s.cover || s.image}
                        alt={s.name || s.nombre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400 font-bold">
                        Sin foto
                      </div>
                    )}
                    {s.is_principal && (
                      <div className="absolute top-3 left-3">
                        <span className="badge badge-gold-premium">
                          <span className="badge-dot bg-[#d4af37]" />
                          Principal
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-grow spacing-card-p pt-0">
                    <h3 className="font-bold text-slate-800 group-hover:text-[#b91c1c] leading-tight tracking-tight transition-colors h3">
                      {s.name || s.nombre}
                    </h3>
                    {(s.address || s.direccion) && (
                      <p className="flex items-start gap-1.5 mt-2 text-[11px] text-slate-500 leading-snug">
                        <svg className="w-3 h-3 mt-0.5 text-[#b91c1c] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {s.address || s.direccion}
                      </p>
                    )}
                    {s.desc && (
                      <p className="mt-3 text-[12px] text-slate-600 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {s.desc}
                      </p>
                    )}

                    <div className="flex justify-end mt-4">
                      <div className="relative bg-slate-900 group-hover:bg-[#b91c1c] shadow-lg px-5 py-3 rounded-xl font-black text-[10px] text-white uppercase tracking-[0.1em] transition-all duration-300">
                        Ver Sede
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SedePage — detalle de una sede + sus habitaciones
// ─────────────────────────────────────────────────────────────
function SedePage({ sedeId, onRoomClick, onNavigate }) {
  const sedes = window.SEDES || [];
  const rooms = window.ROOMS || [];
  const sede = sedes.find((s) => String(s.id) === String(sedeId)) || sedes[0];

  if (!sede) {
    return (
      <div className="pt-32 container mx-auto px-4 text-center text-slate-500">
        Sede no encontrada
      </div>
    );
  }

  const sedeRooms = rooms.filter((r) => String(r.sedeId) === String(sede.id));

  return (
    <>
      <InternalHero
        title={sede.name || sede.nombre}
        subtitle="Sede"
        image={sede.cover || sede.image}
      />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <span className="badge badge-primary spacing-subtitle-mb">
                <span className="badge-dot" />
                Sobre esta sede
              </span>
              <h2 className="h1 mt-2 mb-4">
                {sede.name || sede.nombre}
              </h2>
              <p className="text-lead text-slate-600 mb-6">
                {sede.desc ||
                  'Una sede pensada para tu comodidad: habitaciones limpias, WiFi rápido, agua caliente las 24 horas y atención personalizada.'}
              </p>

              {(sede.address || sede.direccion) && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 radius-default border border-slate-100">
                  <svg className="w-5 h-5 mt-0.5 text-[#b91c1c] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div>
                    <div className="extra-small text-slate-500">Dirección</div>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">
                      {sede.address || sede.direccion}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="card card-body relative self-start">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />
              <div className="extra-small mb-2">Habitaciones en esta sede</div>
              <div className="text-4xl font-black text-[#b91c1c] tracking-tight">
                {sedeRooms.length}
              </div>
              <button
                onClick={() => onNavigate('rooms')}
                className="btn btn-sun btn-pill w-full mt-6"
              >
                Ver todas las habitaciones
              </button>
            </aside>
          </div>
        </div>
      </section>

      {sedeRooms.length > 0 && (
        <section className="bg-slate-50">
          <div className="container mx-auto px-4 lg:px-8">
            <h3 className="h2 mb-8">Habitaciones disponibles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 spacing-grid-gap">
              {sedeRooms.map((room, i) => (
                <RoomCard
                  key={room.id || i}
                  room={room}
                  index={i}
                  onClick={() => onRoomClick(room.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// AmenitiesPage — servicios del hotel
// ─────────────────────────────────────────────────────────────
function AmenitiesPage({ onNavigate }) {
  const items = [
    { icon: '📶', title: 'WiFi gratis', desc: 'Conexión rápida en todas las habitaciones y áreas comunes.' },
    { icon: '🚿', title: 'Agua caliente 24h', desc: 'Sistema de agua caliente con disponibilidad permanente.' },
    { icon: '🛏️', title: 'Limpieza diaria', desc: 'Cambio de sábanas y toallas, limpieza profunda cada día.' },
    { icon: '📺', title: 'TV por cable', desc: 'Canales nacionales e internacionales en cada habitación.' },
    { icon: '🔑', title: 'Recepción 24/7', desc: 'Atención personalizada las 24 horas, todos los días.' },
    { icon: '🛁', title: 'Baño privado', desc: 'Todas las habitaciones cuentan con baño privado equipado.' },
    { icon: '❄️', title: 'Ventilación', desc: 'Ventilación natural o ventilador en cada habitación.' },
    { icon: '🧴', title: 'Amenidades', desc: 'Shampoo, jabón y toallas incluidos en cada estadía.' },
    { icon: '🅿️', title: 'Estacionamiento', desc: 'Espacio disponible en sedes seleccionadas.' },
  ];

  return (
    <>
      <InternalHero
        title="Nuestros Servicios"
        subtitle="Comodidades pensadas para ti"
        image="assets/sol/hero-1.webp"
      />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center spacing-header-mb">
            <span className="badge badge-gold spacing-subtitle-mb">
              <span className="badge-dot" />
              Lo que incluye tu estadía
            </span>
            <h2 className="h1 mt-2">Todo lo necesario, sin complicaciones</h2>
            <p className="text-lead text-slate-500 max-w-2xl mx-auto mt-3">
              Servicios incluidos en cada habitación para que tu visita sea cómoda y sin sorpresas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 spacing-grid-gap">
            {items.map((it, i) => (
              <div
                key={i}
                className="card card-body relative group hover:border-[#b91c1c]/30 transition-colors"
                data-reveal
                data-delay={String((i % 3) * 100)}
              >
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#b91c1c]/10 to-[#ff8006]/10 flex items-center justify-center text-2xl mb-4 group-hover:from-[#b91c1c]/20 group-hover:to-[#ff8006]/20 transition-colors">
                  {it.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight tracking-tight mb-1.5 group-hover:text-[#b91c1c] transition-colors">
                  {it.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{it.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a onClick={() => onNavigate('rooms')} className="btn btn-sun btn-pill px-8 py-4 cursor-pointer">
              Ver Habitaciones
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// GalleryPage — galería en masonry, lightbox al hacer click
// ─────────────────────────────────────────────────────────────
function GalleryPage() {
  const rooms = window.ROOMS || [];
  const sedes = window.SEDES || [];

  const fotos = [];
  rooms.forEach((r) => {
    if (Array.isArray(r.fotos)) {
      r.fotos.forEach((f) => {
        const url = typeof f === 'string' ? f : (f && (f.url || f.src));
        if (url) fotos.push({ url, label: r.name || r.title || 'Habitación' });
      });
    }
  });
  sedes.forEach((s) => {
    if (s.cover) fotos.push({ url: s.cover, label: s.name || s.nombre || 'Sede' });
  });

  const [lightbox, setLightbox] = React.useState(null);

  return (
    <>
      <InternalHero
        title="Galería"
        subtitle="Fotos del hotel"
        image={(fotos[0] && fotos[0].url) || 'assets/sol/hero-1.webp'}
      />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          {fotos.length === 0 ? (
            <div className="bg-white py-20 border border-slate-200 border-dashed text-center radius-lg">
              <p className="font-medium text-slate-500">Aún no hay fotos publicadas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 spacing-grid-gap">
              {fotos.map((f, i) => (
                <div
                  key={i}
                  onClick={() => setLightbox(i)}
                  className="group relative overflow-hidden radius-default cursor-zoom-in aspect-square shadow-sm hover:shadow-xl transition-shadow"
                  data-reveal
                  data-delay={String((i % 4) * 100)}
                >
                  <img
                    src={f.url}
                    alt={f.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {f.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[5500] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out animate-fade-up"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl"
            aria-label="Cerrar"
          >
            ×
          </button>
          <img
            src={fotos[lightbox].url}
            alt={fotos[lightbox].label}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-md shadow-2xl"
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 small">
            {fotos[lightbox].label} · {lightbox + 1} / {fotos.length}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ContactPage — formulario + datos de contacto
// ─────────────────────────────────────────────────────────────
function ContactPage() {
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = React.useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    // Simulación: en versión Laravel iba a /api/contact. Acá enviamos al WhatsApp.
    const text = `Hola, soy ${form.name}.\n\n${form.message}\n\nMi email: ${form.email}\nMi teléfono: ${form.phone}`;
    const phone = '51999999999';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    setSent(true);
  };

  const sedes = window.SEDES || [];
  const principal = sedes.find((s) => s.is_principal) || sedes[0];

  return (
    <>
      <InternalHero
        title="Contáctanos"
        subtitle="Estamos aquí para ayudarte"
        image="assets/sol/hero-1.webp"
      />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Formulario */}
            <div className="lg:col-span-2">
              <span className="badge badge-primary spacing-subtitle-mb">
                <span className="badge-dot" />
                Escríbenos
              </span>
              <h2 className="h1 mt-2 mb-6">Cuéntanos en qué podemos ayudarte</h2>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="extra-small block mb-1.5">Nombre completo</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] transition"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="extra-small block mb-1.5">Teléfono</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] transition"
                      placeholder="+51 999 999 999"
                    />
                  </div>
                </div>
                <div>
                  <label className="extra-small block mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] transition"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="extra-small block mb-1.5">Mensaje</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] transition resize-none"
                    placeholder="Cuéntanos qué necesitas (reserva, consulta sobre habitaciones, etc.)"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button type="submit" className="btn btn-sun btn-pill px-8 py-3">
                    Enviar por WhatsApp
                  </button>
                  {sent && (
                    <span className="text-sm font-semibold text-emerald-600">
                      ✓ Listo, te abrimos WhatsApp.
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Info */}
            <aside className="card card-body relative space-y-5 self-start">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />
              <h3 className="h4 font-bold text-slate-800">Información directa</h3>

              <a
                href="https://wa.me/51999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                </div>
                <div>
                  <div className="extra-small text-emerald-700">WhatsApp</div>
                  <div className="font-bold text-slate-800 text-sm">+51 999 999 999</div>
                  <div className="text-xs text-slate-500 mt-0.5">Respuesta rápida</div>
                </div>
              </a>

              <a
                href="mailto:contacto@caribeperu.com"
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#b91c1c] text-white flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 2v.51l-8 6.22l-8-6.22V6zM4 18V9.04l7.39 5.74c.18.14.4.21.61.21s.43-.07.61-.21L20 9.03v8.96H4Z" />
                  </svg>
                </div>
                <div>
                  <div className="extra-small">Email</div>
                  <div className="font-bold text-slate-800 text-sm">contacto@caribeperu.com</div>
                  <div className="text-xs text-slate-500 mt-0.5">Respondemos en 24h</div>
                </div>
              </a>

              {principal && (principal.address || principal.direccion) && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-[#d4af37] text-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="extra-small">Sede principal</div>
                    <div className="font-bold text-slate-800 text-sm">{principal.name || principal.nombre}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {principal.address || principal.direccion}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// BookingFlow — 3 pasos: fechas / huésped / confirmar
// ─────────────────────────────────────────────────────────────
function BookingFlow({ preselectedRoom, onDone }) {
  const rooms = window.ROOMS || [];
  const [step, setStep] = React.useState(1);
  const [roomId, setRoomId] = React.useState(preselectedRoom || (rooms[0] && rooms[0].id) || null);
  const [dates, setDates] = React.useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });
  const [guest, setGuest] = React.useState({ name: '', email: '', phone: '', dni: '', notes: '' });

  const room = rooms.find((r) => String(r.id) === String(roomId)) || rooms[0];
  const precio = room
    ? Number(room.precioNoche || room.price_promo || room.price_list || room.precio || 0)
    : 0;
  const nights = Math.max(1, Math.round((new Date(dates.end) - new Date(dates.start)) / 86400000));
  const subtotal = precio * nights;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guest.email);
  const validPhone = /^[\d+\s()-]{7,}$/.test(guest.phone);
  const validName = guest.name.trim().length >= 3;

  const canAdvance =
    (step === 1 && !!roomId && nights >= 1) ||
    (step === 2 && validName && validEmail && validPhone);

  const next = () => { if (canAdvance) { setStep((s) => Math.min(3, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const back = () => { setStep((s) => Math.max(1, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const confirmar = () => {
    onDone({
      room,
      nights,
      dates,
      guest,
      subtotal,
      reservaId: 'RES-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    });
  };

  const steps = [
    { n: 1, label: 'Fechas y habitación' },
    { n: 2, label: 'Tus datos' },
    { n: 3, label: 'Confirmar' },
  ];

  return (
    <>
      <InternalHero title="Reserva tu estadía" subtitle="3 pasos rápidos" image={roomCover(room) || 'assets/sol/hero-1.webp'} />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Progreso */}
          <div className="flex flex-row items-center gap-0 mb-10">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      step >= s.n
                        ? 'bg-[#b91c1c] text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <div
                    className={`text-sm font-bold hidden sm:block ${
                      step >= s.n ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-px mx-3 bg-gradient-to-r from-[#b91c1c]/40 via-slate-200 to-slate-200" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-5">
              {step === 1 && (
                <div className="card card-body">
                  <h2 className="h2 mb-4">¿Cuándo te quedás?</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="extra-small block mb-1.5">Llegada</label>
                      <input
                        type="date"
                        value={dates.start}
                        onChange={(e) => setDates({ ...dates, start: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c]"
                      />
                    </div>
                    <div>
                      <label className="extra-small block mb-1.5">Salida</label>
                      <input
                        type="date"
                        value={dates.end}
                        onChange={(e) => setDates({ ...dates, end: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c]"
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-600">
                    <strong className="text-slate-800">{nights}</strong>{' '}
                    {nights === 1 ? 'noche' : 'noches'}
                  </div>

                  {rooms.length > 1 && (
                    <>
                      <div className="extra-small mt-6 mb-2 block">Habitación</div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {rooms.slice(0, 6).map((r) => {
                          const active = String(r.id) === String(roomId);
                          return (
                            <button
                              key={r.id}
                              onClick={() => setRoomId(r.id)}
                              className={`text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${
                                active
                                  ? 'border-[#b91c1c] bg-[#b91c1c]/5'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {roomCover(r) && (
                                <img src={roomCover(r)} alt={r.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-slate-800 truncate">{r.name || r.title}</div>
                                <div className="text-xs text-[#b91c1c] font-bold mt-0.5">
                                  {moneyPE(r.precioNoche || r.price_promo || r.price_list || r.precio)} / noche
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="card card-body">
                  <h2 className="h2 mb-4">Tus datos</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="extra-small block mb-1.5">Nombre completo</label>
                      <input
                        type="text"
                        value={guest.name}
                        onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c]"
                      />
                    </div>
                    <div>
                      <label className="extra-small block mb-1.5">DNI</label>
                      <input
                        type="text"
                        value={guest.dni}
                        onChange={(e) => setGuest({ ...guest, dni: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c]"
                      />
                    </div>
                    <div>
                      <label className="extra-small block mb-1.5">Email</label>
                      <input
                        type="email"
                        value={guest.email}
                        onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c]"
                      />
                    </div>
                    <div>
                      <label className="extra-small block mb-1.5">Teléfono</label>
                      <input
                        type="tel"
                        value={guest.phone}
                        onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c]"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="extra-small block mb-1.5">Notas (opcional)</label>
                    <textarea
                      rows={3}
                      value={guest.notes}
                      onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] resize-none"
                      placeholder="Llegada tarde, requerimientos especiales, etc."
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="card card-body">
                  <h2 className="h2 mb-4">Confirmá tu reserva</h2>
                  <div className="space-y-3 text-sm">
                    <Row k="Habitación" v={room ? (room.name || room.title) : '—'} />
                    <Row k="Llegada" v={new Date(dates.start).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })} />
                    <Row k="Salida"  v={new Date(dates.end).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })} />
                    <Row k="Noches"  v={String(nights)} />
                    <Row k="Huésped" v={guest.name} />
                    <Row k="Email"   v={guest.email} />
                    <Row k="Teléfono" v={guest.phone} />
                    {guest.notes && <Row k="Notas" v={guest.notes} />}
                  </div>
                  <div className="mt-5 p-4 rounded-xl bg-[#fff7e6] border border-[#d4af37]/30">
                    <p className="text-xs text-slate-600">
                      Al confirmar, te enviaremos los detalles por WhatsApp y email. Coordinamos el pago al ingresar
                      (efectivo, Yape, Plin, Visa o Mastercard).
                    </p>
                  </div>
                </div>
              )}

              {/* Botonera */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <button onClick={back} className="btn btn-light btn-pill px-6 py-3">
                    ← Volver
                  </button>
                ) : <span />}

                {step < 3 ? (
                  <button
                    onClick={next}
                    disabled={!canAdvance}
                    className="btn btn-sun btn-pill px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuar →
                  </button>
                ) : (
                  <button onClick={confirmar} className="btn btn-sun btn-pill px-8 py-3">
                    Confirmar reserva
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar resumen */}
            <aside className="card card-body relative self-start">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />
              <div className="extra-small mb-2">Resumen</div>
              <h3 className="h4 mb-2">{room ? (room.name || room.title) : 'Habitación'}</h3>
              {room && roomCover(room) && (
                <img src={roomCover(room)} alt={room.name} className="w-full h-36 object-cover radius-default mb-4" />
              )}
              <div className="space-y-1.5 text-sm">
                <Row k="Tarifa por noche" v={moneyPE(precio)} />
                <Row k="Noches" v={String(nights)} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="extra-small">Subtotal</span>
                <span className="text-2xl font-black text-[#b91c1c] tracking-tight">{moneyPE(subtotal)}</span>
              </div>
              <p className="extra-small mt-2">Pago al ingresar · Cancelación según política</p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-xs uppercase tracking-wider">{k}</span>
      <span className="font-bold text-slate-800 text-sm text-right">{v}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BookingConfirmed — pantalla de éxito
// ─────────────────────────────────────────────────────────────
function BookingConfirmed({ booking, onHome }) {
  const b = booking || {};
  return (
    <>
      <section className="relative bg-gradient-to-b from-[#0f0404] via-[#3b0909] to-[#3b0909] !pt-32 !pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#d4af37]/15 blur-[120px] rounded-full w-[500px] h-[500px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 bg-[#ff8006]/15 blur-[120px] rounded-full w-[500px] h-[500px] pointer-events-none" />
        <div className="relative container mx-auto px-4 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#d4af37] to-[#ff8006] shadow-[0_10px_30px_rgba(212,175,55,0.5)] mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <span className="badge badge-gold-premium mb-4">
            <span className="badge-dot bg-[#d4af37]" />
            Reserva confirmada
          </span>
          <h1 className="h1x2 text-white leading-[1.05] mb-4">¡Listo!</h1>
          <p className="text-lead text-white/80 max-w-2xl mx-auto">
            Tu reserva fue registrada. Te contactaremos por WhatsApp y email con los próximos pasos.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <div className="card card-body relative">
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />
            <div className="extra-small mb-1">N° de reserva</div>
            <div className="font-black text-3xl text-[#b91c1c] tracking-tight mb-6">
              {b.reservaId || '—'}
            </div>
            <div className="space-y-2 text-sm">
              {b.room && <Row k="Habitación" v={b.room.name || b.room.title} />}
              {b.dates && <Row k="Llegada" v={new Date(b.dates.start).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })} />}
              {b.dates && <Row k="Salida"  v={new Date(b.dates.end).toLocaleDateString('es-PE',   { day: '2-digit', month: 'long', year: 'numeric' })} />}
              {b.nights && <Row k="Noches" v={String(b.nights)} />}
              {b.guest && <Row k="Huésped" v={b.guest.name} />}
              {b.guest && <Row k="Email" v={b.guest.email} />}
              {b.guest && <Row k="Teléfono" v={b.guest.phone} />}
              {b.subtotal != null && <Row k="Subtotal" v={moneyPE(b.subtotal)} />}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={onHome} className="btn btn-sun btn-pill px-6 py-3">
                Volver al inicio
              </button>
              <a
                href={`https://wa.me/51999999999?text=${encodeURIComponent(`Hola, soy ${b.guest?.name || ''}. Mi reserva es ${b.reservaId || ''}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-pill px-6 py-3"
              >
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

Object.assign(window, {
  SedesPage, SedePage, AmenitiesPage, GalleryPage,
  ContactPage, BookingFlow, BookingConfirmed,
});
