// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — Home (estilo Sol Caribe Premium)
// HotelHero · RoomsBySede · ReviewsSection · CTASection
// ─────────────────────────────────────────────────────────────

function HotelHero({ onNavigate }) {
  const swiperRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const [activeSlide, setActiveSlide] = React.useState(0);

  const slides = React.useMemo(() => {
    const fotos = [];
    if (Array.isArray(window.SEDES)) {
      window.SEDES.forEach((s) => { if (s.cover) fotos.push(s.cover); });
    }
    if (Array.isArray(window.ROOMS)) {
      window.ROOMS.forEach((r) => {
        const f = Array.isArray(r.fotos) && r.fotos[0] ? r.fotos[0] : null;
        if (f) fotos.push(typeof f === 'string' ? f : (f.url || ''));
      });
    }
    const fallback = ['assets/hero-1.jpg', 'assets/hero-2.jpg', 'assets/hero-3.jpg'];
    const imgs = fotos.filter(Boolean).length > 0 ? fotos.filter(Boolean).slice(0, 3) : fallback;
    return [
      { img: imgs[0] || fallback[0], subtitle: 'Bienvenidos a Hs Sol Caribe', title: 'Tu hogar fuera de casa', description: 'Habitaciones cómodas, WiFi rápido, agua caliente las 24 horas y un equipo que te recibe como en familia.', cta: 'Ver Habitaciones', go: 'rooms' },
      { img: imgs[1] || imgs[0] || fallback[1], subtitle: 'Promo Sol', title: 'Hospédate con la mejor tarifa garantizada', description: 'Reserva directo y aprovecha descuentos exclusivos para huéspedes recurrentes.', cta: 'Reservar Ahora', go: 'rooms' },
      { img: imgs[2] || imgs[0] || fallback[2], subtitle: 'Nuestras Sedes', title: 'Una sede para cada plan', description: 'Distintas ubicaciones, mismo estándar de calidad y servicio Sol Caribe.', cta: 'Conoce las Sedes', go: 'sedes' },
    ];
  }, []);

  React.useEffect(() => {
    if (!containerRef.current || typeof window.Swiper === 'undefined') return;
    const Sw = window.Swiper;
    swiperRef.current = new Sw(containerRef.current, {
      effect: 'fade',
      fadeEffect: { crossFade: true },
      loop: true,
      autoplay: { delay: 6000, disableOnInteraction: false },
      pagination: { el: '.hero-pagination', clickable: true },
      on: { slideChange: (s) => setActiveSlide(s.realIndex) },
    });
    return () => { try { swiperRef.current?.destroy(true, true); } catch (e) {} };
  }, []);

  return (
    <section className="group relative bg-slate-950 !py-0 h-screen overflow-hidden">
      <div ref={containerRef} className="w-full h-full swiper">
        <div className="swiper-wrapper">
          {slides.map((slide, index) => (
            <div key={index} className="relative swiper-slide">
              <div className="absolute inset-0 transition-transform duration-[8000ms] group-hover:scale-105">
                <img src={slide.img} alt={slide.title} className="w-full h-full object-cover transition-opacity duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/60 to-black/40" />
              </div>

              <div className="z-10 relative flex items-center mx-auto px-4 lg:px-8 h-full container">
                <div className="items-center gap-12 grid lg:grid-cols-2 mx-auto pt-[100px] w-full max-w-[90%]">
                  <div className="relative w-full z-10">
                    <div className="group/card relative flex flex-col items-start px-4 lg:px-0 max-w-2xl">
                      <div className="top-1/2 left-0 -z-10 absolute bg-gradient-to-br from-[#d4af37]/20 via-[#ff8006]/10 to-transparent opacity-60 blur-3xl w-full h-[150%] -translate-y-1/2 animate-pulse pointer-events-none" />
                      <div className="bottom-0 left-0 -z-10 absolute bg-[#b91c1c]/10 opacity-30 blur-3xl w-64 h-64 animate-pulse pointer-events-none" />

                      <div className={`inline-flex items-center gap-3 bg-gradient-to-r from-[#b91c1c] to-[#ff8006] shadow-[0_5px_20px_rgba(185,28,28,0.3)] mb-6 px-5 py-2.5 rounded-full ring-4 ring-[#d4af37]/20 ${activeSlide === index ? 'animate-fade-left animate-delay-150' : 'opacity-0'}`}>
                        <span className="flex bg-white rounded-full w-2 h-2 animate-ping" />
                        <span className="font-semibold text-white tracking-[0.2em] extra-small" style={{ color: '#fff' }}>{slide.subtitle}</span>
                      </div>

                      <div className={`mb-6 ${activeSlide === index ? 'animate-fade-left animate-delay-300' : 'opacity-0'}`}>
                        {index === 0 ? (
                          <h1 className="h1x2 font-bold text-white leading-[1.05] tracking-tight drop-shadow-hero">{slide.title}</h1>
                        ) : (
                          <div className="h1x2 font-bold text-white leading-[1.05] tracking-tight drop-shadow-hero">{slide.title}</div>
                        )}
                      </div>

                      <div className={`mb-10 ${activeSlide === index ? 'animate-fade-left animate-delay-500' : 'opacity-0'}`}>
                        <p className="drop-shadow-soft max-w-prose text-lead text-white/90">{slide.description}</p>
                      </div>

                      <div className={`${activeSlide === index ? 'animate-fade-left animate-delay-700' : 'opacity-0'}`}>
                        <a onClick={() => onNavigate(slide.go)} className="btn btn-sun btn-pill px-8 py-4 cursor-pointer">{slide.cta}</a>
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:block" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-pagination swiper-pagination" />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function RoomsBySede({ onRoomClick, onSedeClick }) {
  const allSedes = window.SEDES || [];
  const allRooms = window.ROOMS || [];
  const [filter, setFilter] = React.useState('all');

  const filtered = filter === 'all'
    ? allRooms.slice(0, 6)
    : allRooms.filter((r) => String(r.sedeId) === String(filter)).slice(0, 6);

  const goAll = () => {
    try { window.dispatchEvent(new CustomEvent('hsc:navigate', { detail: 'rooms' })); } catch (e) {}
  };

  return (
    <section className="relative bg-white overflow-hidden" data-reveal>
      <div className="-top-24 -right-24 absolute bg-[#b91c1c]/5 blur-3xl rounded-full w-96 h-96 pointer-events-none" />
      <div className="-bottom-24 -left-24 absolute bg-[#ff8006]/5 blur-3xl rounded-full w-96 h-96 pointer-events-none" />

      <div className="z-10 relative container mx-auto px-4 lg:px-8">
        <div className="flex flex-row justify-between items-end gap-4 spacing-header-mb">
          <div className="flex-1">
            <span className="badge badge-primary spacing-subtitle-mb">
              <span className="badge-dot" />
              Estancias Inolvidables
            </span>
            <h2 className="h1 mt-2">Habitaciones Recomendadas</h2>
          </div>
          <a onClick={goAll} className="hidden sm:flex btn btn-outline-primary btn-md btn-pill cursor-pointer">
            Ver todas
          </a>
        </div>

        {allSedes.length > 0 && (
          <div className="spacing-content-mb">
            <div className="flex flex-row sm:flex-wrap items-center gap-3 -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 sm:pb-0 overflow-x-auto sm:overflow-x-visible no-scrollbar">
              <button
                onClick={() => setFilter('all')}
                className={`flex-none btn btn-sm btn-pill ${filter === 'all' ? 'btn-primary' : 'btn-light'}`}
              >
                Todas
              </button>
              {allSedes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilter(String(s.id))}
                  className={`flex-none btn btn-sm btn-pill ${String(filter) === String(s.id) ? 'btn-primary' : 'btn-light'}`}
                >
                  {s.name || s.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 spacing-grid-gap">
          {filtered.length === 0 ? (
            <div className="col-span-full bg-white py-20 border border-slate-200 border-dashed text-center radius-lg">
              <p className="font-medium text-slate-500">No hay habitaciones disponibles aún.</p>
            </div>
          ) : (
            filtered.map((room, index) => (
              <RoomCard
                key={room.id || index}
                room={room}
                index={index}
                onClick={() => onRoomClick && onRoomClick(room.id)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function ReviewsSection() {
  const reviews = [
    { name: 'María González', city: 'Cusco, Perú',    text: 'Estancia impecable. Habitación limpia, agua caliente todo el tiempo y trato muy amable.', stars: 5 },
    { name: 'Andrés Quispe',  city: 'Arequipa, Perú', text: 'Excelente ubicación, fácil acceso y precio justo. Volveré sin dudarlo.',                  stars: 5 },
    { name: 'Luciana Pérez',  city: 'Lima, Perú',     text: 'El detalle de la limpieza diaria marca la diferencia. Recomendado.',                       stars: 5 },
  ];

  return (
    <section className="relative bg-gradient-to-b from-[#fff7e6] via-white to-white overflow-hidden" data-reveal>
      <div className="z-10 relative container mx-auto px-4 lg:px-8">
        <div className="text-center spacing-header-mb">
          <span className="badge badge-gold spacing-subtitle-mb">
            <span className="badge-dot" />
            Lo que dicen
          </span>
          <h2 className="h1 mt-2">Huéspedes felices</h2>
          <p className="text-lead text-slate-500 max-w-2xl mx-auto mt-3">
            La opinión de quienes ya se hospedaron es la mejor referencia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 spacing-grid-gap">
          {reviews.map((r, i) => (
            <div key={i} className="card card-body relative" data-reveal data-delay={String((i + 1) * 100)}>
              <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5 w-full" />
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className={`w-4 h-4 ${j < r.stars ? 'text-[#d4af37]' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-4">"{r.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#b91c1c] to-[#ff8006] text-white flex items-center justify-center font-bold">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{r.name}</div>
                  <div className="extra-small">{r.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function CTASection({ onNavigate }) {
  return (
    <section className="relative overflow-hidden" data-reveal>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative bg-gradient-to-br from-[#0f0404] via-[#3b0909] to-[#3b0909] rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 bg-[#d4af37]/20 blur-[120px] rounded-full w-[400px] h-[400px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 bg-[#ff8006]/15 blur-[120px] rounded-full w-[400px] h-[400px] pointer-events-none" />
          <div className="bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent h-px w-full" />

          <div className="relative grid md:grid-cols-2 gap-10 px-6 sm:px-10 lg:px-16 py-16 md:py-20 items-center">
            <div>
              <span className="badge badge-gold-premium mb-5">
                <span className="badge-dot bg-[#d4af37]" />
                Reserva directa
              </span>
              <h2 className="h1x2 text-white leading-[1.05] mb-5">
                Tu próxima estancia te está esperando
              </h2>
              <p className="text-lead text-white/70 max-w-prose mb-8">
                Mejor precio garantizado, atención cercana y la comodidad que mereces.
                Reservá en menos de un minuto.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a onClick={() => onNavigate('rooms')} className="btn btn-sun btn-pill px-8 py-4 cursor-pointer">
                  Ver Habitaciones
                </a>
                <a onClick={() => onNavigate('contact')} className="btn btn-light btn-pill px-6 py-3 cursor-pointer">
                  Hablar con recepción
                </a>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#3b0909] to-transparent pointer-events-none z-10" />
              <img
                src={HOTEL.logo}
                alt="Sol Caribe"
                className="w-full max-w-sm mx-auto drop-shadow-[0_20px_50px_rgba(212,175,55,0.4)] object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { HotelHero, RoomsBySede, ReviewsSection, CTASection });
