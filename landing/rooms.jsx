// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — Habitaciones (listado + detalle + RoomCard)
// Estilo Sol Caribe Premium
// ─────────────────────────────────────────────────────────────

function moneyPE(n) {
  if (n == null || isNaN(n)) return '—';
  return 'S/ ' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function roomCover(room) {
  if (!room) return null;
  if (Array.isArray(room.fotos) && room.fotos.length > 0) {
    const f = room.fotos[0];
    return typeof f === 'string' ? f : (f.url || f.src || null);
  }
  return room.cover || room.image || null;
}

// ─────────────────────────────────────────────────────────────
// RoomCard — tarjeta de habitación con galería swiper opcional
// ─────────────────────────────────────────────────────────────
function RoomCard({ room, index, onClick }) {
  const sedes = window.SEDES || [];
  const sede = sedes.find((s) => String(s.id) === String(room.sedeId));
  const cover = roomCover(room);
  const precio = room.precioNoche != null
    ? Number(room.precioNoche)
    : (room.price_promo || room.price_list || room.precio || null);
  const precioRegular = room.price_list || null;
  const stars = room.stars || 5;
  const isRecomendada = !!(room.is_recommended || room.recomendada);
  const capacidad = room.capacity || ((room.capacity_adults || 2) + (room.capacity_children || 0));

  return (
    <a
      onClick={onClick}
      className="group relative flex flex-col bg-white shadow-sm hover:shadow-2xl border border-slate-100 overflow-hidden no-underline transition-all duration-500 radius-lg cursor-pointer"
    >
      {/* Imagen */}
      <div className="relative m-3 h-52 overflow-hidden radius-default">
        {cover ? (
          <img
            src={cover}
            alt={room.name || room.title || 'Habitación'}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400 font-bold">
            Sin foto
          </div>
        )}

        {/* Badges */}
        <div className="top-3 left-3 z-20 absolute flex flex-wrap items-center gap-2 pr-10">
          {isRecomendada && (
            <span className="flex items-center gap-1.5 bg-[#b91c1c]/80 shadow-sm backdrop-blur-md px-3 py-1 rounded-full font-bold text-[10px] text-white">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              Recomendada
            </span>
          )}
          {!isRecomendada && (
            <span className="flex items-center gap-1.5 bg-white/70 shadow-sm backdrop-blur-md px-3 py-1 border border-white/20 rounded-full font-bold text-[10px] text-slate-800">
              <span className="bg-emerald-500 rounded-full w-1.5 h-1.5 animate-pulse" />
              Disponible
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-grow spacing-card-p pt-0">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-slate-800 group-hover:text-[#b91c1c] leading-tight tracking-tight transition-colors h4">
            {room.name || room.title || `Habitación ${room.num || ''}`}
          </h3>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {sede && (
            <p className="flex items-center gap-1.5 font-bold text-[9px] text-slate-600 uppercase leading-none tracking-widest">
              <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {sede.name || sede.nombre}
            </p>
          )}
          {sede && <div className="bg-slate-300 rounded-full w-1 h-1" />}
          <p className="flex items-center gap-1.5 font-bold text-[9px] text-slate-600 uppercase leading-none tracking-widest">
            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            {String(capacidad).padStart(2, '0')} Pax
          </p>
        </div>

        {room.desc && (
          <p className="mt-3 text-[11px] text-slate-600 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {room.desc}
          </p>
        )}

        {/* Precio */}
        <div className="group/price relative bg-slate-50 mt-6 p-4 border border-slate-100 overflow-hidden radius-default">
          <div className="top-0 right-0 absolute bg-[#b91c1c]/5 -mt-8 -mr-8 rounded-full w-24 h-24 group-hover/price:scale-110 transition-transform duration-500" />
          <div className="top-0 right-0 left-0 absolute bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />

          <div className="z-10 relative flex flex-col gap-1">
            {precio != null && (
              <div className="flex items-end gap-2">
                <span className="font-black text-[#b91c1c] text-xl leading-none tracking-tight">
                  {moneyPE(precio)}
                </span>
                {precioRegular && precioRegular > precio && (
                  <span className="opacity-60 mb-0.5 font-bold text-[10px] text-slate-400 line-through leading-none">
                    {moneyPE(precioRegular)}
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="z-10 relative mt-2 font-bold text-[8px] text-slate-500 uppercase leading-none tracking-widest">
            Por noche · Incl. impuestos
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-4 mt-4">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className={`w-3.5 h-3.5 ${i < stars ? 'text-[#d4af37]' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            ))}
          </div>
          <div className="group/cta relative">
            <div className="absolute -inset-1.5 bg-[#b91c1c]/20 opacity-0 group-hover:opacity-100 blur-sm rounded-xl transition-all duration-300" />
            <div className="relative bg-slate-900 group-hover:bg-[#b91c1c] shadow-lg px-5 py-3 rounded-xl font-black text-[10px] text-white uppercase tracking-[0.1em] transition-all duration-300">
              Detalles
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero pequeño para páginas internas
// ─────────────────────────────────────────────────────────────
function InternalHero({ title, subtitle, image }) {
  const bg = image || 'assets/hero-1.jpg';
  return (
    <section className="relative bg-slate-950 !py-0 h-[55vh] min-h-[420px] overflow-hidden">
      <div className="absolute inset-0">
        <img src={bg} alt={title} className="w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/30" />
      </div>
      <div className="relative z-10 flex items-end h-full container mx-auto px-4 lg:px-8 pb-14">
        <div className="max-w-3xl">
          {subtitle && (
            <span className="badge badge-gold-premium mb-4">
              <span className="badge-dot bg-[#d4af37]" />
              {subtitle}
            </span>
          )}
          <h1 className="h1x2 text-white drop-shadow-hero leading-[1.1]">{title}</h1>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// RoomsListPage — listado con filtros
// ─────────────────────────────────────────────────────────────
function RoomsListPage({ onRoomClick, onSedeClick }) {
  const allRooms = window.ROOMS || [];
  const allSedes = window.SEDES || [];
  const [filter, setFilter] = React.useState('all');

  const filtered = filter === 'all'
    ? allRooms
    : allRooms.filter((r) => String(r.sedeId) === String(filter));

  return (
    <>
      <InternalHero
        title="Nuestras Habitaciones"
        subtitle="Encuentra tu próximo lugar"
        image={roomCover(allRooms[0]) || 'assets/hero-1.jpg'}
      />

      <section className="relative bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="spacing-content-mb flex flex-wrap items-center gap-3 -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 overflow-x-auto sm:overflow-x-visible no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm btn-pill flex-none ${filter === 'all' ? 'btn-primary' : 'btn-light'}`}
            >
              Todas las sedes
            </button>
            {allSedes.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter(String(s.id))}
                className={`btn btn-sm btn-pill flex-none ${String(filter) === String(s.id) ? 'btn-primary' : 'btn-light'}`}
              >
                {s.name || s.nombre}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 spacing-grid-gap">
            {filtered.length === 0 ? (
              <div className="col-span-full bg-white py-20 border border-slate-200 border-dashed text-center radius-lg">
                <p className="font-medium text-slate-500">No hay habitaciones disponibles aún.</p>
              </div>
            ) : (
              filtered.map((room, index) => (
                <RoomCard key={room.id || index} room={room} index={index} onClick={() => onRoomClick(room.id)} />
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// RoomDetailPage — detalle con foto grande, info y CTA
// ─────────────────────────────────────────────────────────────
function RoomDetailPage({ roomId, onBack, onBook, onSedeClick }) {
  const allRooms = window.ROOMS || [];
  const allSedes = window.SEDES || [];
  const room = allRooms.find((r) => String(r.id) === String(roomId)) || allRooms[0];
  if (!room) return <div className="pt-32 container mx-auto px-4 text-center text-slate-500">Habitación no encontrada</div>;

  const sede = allSedes.find((s) => String(s.id) === String(room.sedeId));
  const fotos = Array.isArray(room.fotos) ? room.fotos.map((f) => (typeof f === 'string' ? f : f.url || f.src)).filter(Boolean) : [];
  const cover = fotos[0] || roomCover(room);
  const precio = room.precioNoche != null ? Number(room.precioNoche) : (room.price_promo || room.price_list || null);

  return (
    <>
      <InternalHero
        title={room.name || `Habitación ${room.num || ''}`}
        subtitle={sede ? sede.name : 'Habitación'}
        image={cover}
      />

      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <button
            onClick={onBack}
            className="btn btn-light btn-sm btn-pill mb-6 cursor-pointer"
          >
            ← Volver al listado
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cover && (
                <img src={cover} alt={room.name} className="w-full h-[420px] object-cover radius-lg shadow-sm" />
              )}
              {fotos.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {fotos.slice(1, 4).map((f, i) => (
                    <img key={i} src={f} alt={`${room.name} ${i + 2}`} className="w-full h-32 object-cover radius-default" />
                  ))}
                </div>
              )}

              <div className="pt-6">
                <h2 className="h2 text-slate-800 mb-3">Sobre esta habitación</h2>
                <p className="text-lead text-slate-600">
                  {room.desc || 'Habitación cómoda con WiFi, TV y baño privado. Limpieza diaria.'}
                </p>
              </div>
            </div>

            {/* Sidebar precio */}
            <aside className="lg:sticky lg:top-28 self-start card card-body relative">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent h-0.5" />
              <div className="extra-small mb-1">Precio por noche</div>
              <div className="text-3xl font-black text-[#b91c1c] tracking-tight">
                {moneyPE(precio)}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                Incl. impuestos
              </p>

              <button
                onClick={() => onBook && onBook(room.id)}
                className="btn btn-sun btn-pill w-full mt-6"
              >
                Reservar ahora
              </button>

              {sede && (
                <button
                  onClick={() => onSedeClick && onSedeClick(sede.id)}
                  className="btn btn-outline-primary btn-pill w-full mt-3"
                >
                  Ver sede {sede.name}
                </button>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

Object.assign(window, { RoomCard, InternalHero, RoomsListPage, RoomDetailPage, moneyPE, roomCover });
