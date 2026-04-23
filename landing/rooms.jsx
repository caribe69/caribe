// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — Listado de habitaciones + Detalle
// ─────────────────────────────────────────────────────────────

function RoomsListPage({ onRoomClick, onNavigate, onSedeClick }) {
  const [filters, setFilters] = React.useState({
    sede: 'all',
    tier: 'all',
    view: 'all',
    guests: 0,
    maxPrice: 1000000,
    sort: 'num',
  });

  const tiers = ['all', ...new Set(ROOMS.map(r => r.tier))];
  const views = ['all', ...new Set(ROOMS.map(r => r.view))];

  let filtered = ROOMS.filter(r =>
    (filters.sede === 'all' || r.sede === filters.sede) &&
    (filters.tier === 'all' || r.tier === filters.tier) &&
    (filters.view === 'all' || r.view === filters.view) &&
    (filters.guests === 0 || r.capacity >= filters.guests) &&
    (r.price <= filters.maxPrice)
  );

  if (filters.sort === 'price-asc') filtered = [...filtered].sort((a,b) => a.price - b.price);
  if (filters.sort === 'price-desc') filtered = [...filtered].sort((a,b) => b.price - a.price);
  if (filters.sort === 'size') filtered = [...filtered].sort((a,b) => b.size - a.size);

  return (
    <div>
      {/* Header */}
      <section style={{ padding: '100px 48px 40px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="mono" style={{ marginBottom: 24, color: 'var(--brown-soft)' }}>· Habitaciones</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 60 }}>
            <h1 className="display" style={{ fontSize: 'clamp(64px, 8vw, 120px)', lineHeight: 0.95, margin: 0, fontWeight: 400 }}>
              Once habitaciones,<br/>
              <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>una sola casa.</span>
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--brown)', maxWidth: 380 }}>
              Todas nuestras habitaciones incluyen desayuno criollo, Wi-Fi, aire acondicionado y acceso a la piscina. Varían en tamaño, vista y cantidad de huéspedes.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section style={{
        position: 'sticky', top: 78, zIndex: 40,
        padding: '20px 48px', background: 'var(--cream)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <FilterSelect label="Sede" value={filters.sede} onChange={v => setFilters({...filters, sede: v})}
            options={[{value:'all',label:'Todas las sedes'}, ...SEDES.map(s => ({ value: s.id, label: s.short }))]}/>
          <FilterSelect label="Categoría" value={filters.tier} onChange={v => setFilters({...filters, tier: v})}
            options={tiers.map(t => ({ value: t, label: t === 'all' ? 'Todas' : t }))}/>
          <FilterSelect label="Vista" value={filters.view} onChange={v => setFilters({...filters, view: v})}
            options={views.map(t => ({ value: t, label: t === 'all' ? 'Todas' : t }))}/>
          <FilterSelect label="Huéspedes" value={filters.guests} onChange={v => setFilters({...filters, guests: +v})}
            options={[{value:0,label:'Cualquiera'},{value:1,label:'1+'},{value:2,label:'2+'},{value:3,label:'3+'},{value:4,label:'4+'}]}/>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="ch-label">Precio hasta</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min="150000" max="1000000" step="20000"
                value={filters.maxPrice}
                onChange={e => setFilters({...filters, maxPrice: +e.target.value})}
                style={{ flex: 1, accentColor: 'var(--terracotta)' }}/>
              <div className="mono" style={{ fontSize: 11, minWidth: 90 }}>{formatCOP(filters.maxPrice)}</div>
            </div>
          </div>

          <FilterSelect label="Ordenar" value={filters.sort} onChange={v => setFilters({...filters, sort: v})}
            options={[
              {value:'num',label:'Recomendado'},
              {value:'price-asc',label:'Precio: menor'},
              {value:'price-desc',label:'Precio: mayor'},
              {value:'size',label:'Tamaño'},
            ]}/>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brown-soft)' }}>
            <span className="mono">{filtered.length}</span> de {ROOMS.length}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '60px 48px 140px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--brown-soft)' }}>
              <div className="display" style={{ fontSize: 40, fontStyle: 'italic' }}>Sin resultados</div>
              <p style={{ marginTop: 16 }}>Ajusta los filtros para ver más habitaciones.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {filtered.map((room, i) => (
                <RoomRow key={room.id} room={room} index={i} onClick={() => onRoomClick(room.id)}/>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div className="ch-label">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--f-sans)', fontSize: 14, padding: '8px 0', width: '100%',
          color: 'var(--ink)', cursor: 'pointer', outline: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235C4A3A' fill='none' stroke-width='1.2'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', appearance: 'none',
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function RoomRow({ room, index, onClick }) {
  const isEven = index % 2 === 0;
  const sede = SEDES.find(s => s.id === room.sede);
  return (
    <article onClick={onClick} style={{
      display: 'grid', gridTemplateColumns: isEven ? '1.4fr 1fr' : '1fr 1.4fr',
      gap: 60, background: 'var(--cream-2)', cursor: 'pointer', minHeight: 380,
      transition: 'background 0.3s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--sand)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--cream-2)'}>
      {isEven && <RoomRowImage room={room}/>}
      <div style={{ padding: '50px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gridColumn: isEven ? 2 : 1, gridRow: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="display" style={{ fontSize: 32, color: 'var(--terracotta)', fontStyle: 'italic', fontWeight: 300 }}>· {room.num} ·</div>
            {sede && <div className="mono" style={{ color: 'var(--ink)', background: 'var(--sand)', padding: '4px 10px' }}>{sede.short}</div>}
            <div className="mono" style={{ color: 'var(--brown-soft)' }}>{room.tier}</div>
            {room.popular && <span className="ch-badge">Popular</span>}
          </div>
          <h3 className="display" style={{ fontSize: 52, fontWeight: 400, margin: 0, lineHeight: 1 }}>
            {room.name}
          </h3>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--brown)', marginTop: 24, maxWidth: 480 }}>
            {room.desc}
          </p>

          <div style={{ marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {room.features.slice(0, 4).map(f => (
              <div key={f} style={{ fontSize: 12, color: 'var(--brown)' }}>
                <span style={{ color: 'var(--terracotta)', marginRight: 8 }}>◆</span>{f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="mono" style={{ color: 'var(--brown-soft)', marginBottom: 6 }}>Desde</div>
            <div className="display" style={{ fontSize: 36, color: 'var(--ink)', fontWeight: 500 }}>
              {formatCOP(room.price)} <span style={{ fontSize: 13, color: 'var(--brown-soft)', fontStyle: 'italic' }}>/ noche</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ch-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>Ver detalles</button>
          </div>
        </div>
      </div>
      {!isEven && <RoomRowImage room={room}/>}
    </article>
  );
}

function RoomRowImage({ room }) {
  return (
    <div className="ch-img-wrap" style={{ minHeight: 380 }}>
      <img src={room.img} alt={room.name}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detalle de habitación
// ─────────────────────────────────────────────────────────────
function RoomDetailPage({ roomId, onBack, onBook, onSedeClick }) {
  const room = ROOMS.find(r => r.id === roomId) || ROOMS[0];
  const sede = SEDES.find(s => s.id === room.sede);
  const [imgIdx, setImgIdx] = React.useState(0);
  const [lightbox, setLightbox] = React.useState(false);

  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* Breadcrumb compacto */}
      <div style={{ padding: '16px 40px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
          <a className="ch-link mono" onClick={onBack} style={{ cursor: 'pointer' }}>← Habitaciones</a>
          <span className="mono" style={{ color: 'var(--brown-soft)' }}>/ {room.name}</span>
        </div>
      </div>

      {/* HERO compacto + layout lado-a-lado */}
      <section style={{ padding: '20px 40px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Título + metadatos en una fila */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <h1 className="display" style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', lineHeight: 1, margin: 0, fontWeight: 500 }}>
              {room.name}
            </h1>
            {sede && (
              <a onClick={() => onSedeClick && onSedeClick(sede.id)} className="ch-link mono"
                style={{ color: 'var(--ink)', background: 'var(--sand)', padding: '4px 10px', cursor: 'pointer', fontSize: 10 }}>
                📍 {sede.short} · {sede.city}
              </a>
            )}
            <span className="mono" style={{ color: 'var(--brown-soft)', fontSize: 10 }}>{room.tier}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brown)' }}>
              ⭐ 4.9 · {room.size} m² · {room.capacity} huéspedes
            </span>
          </div>

          {/* MAIN GRID: galería | info reserva */}
          <div className="ch-room-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
            {/* Galería compacta */}
            <div>
              <div className="ch-img-wrap" style={{ cursor: 'zoom-in', aspectRatio: '16/10', marginBottom: 10 }} onClick={() => setLightbox(true)}>
                <img src={room.gallery[imgIdx] || room.img}/>
              </div>
              {/* Thumbnails horizontales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {room.gallery.slice(0, 4).map((src, i) => (
                  <div key={i}
                    onClick={() => setImgIdx(i)}
                    className="ch-img-wrap"
                    style={{
                      cursor: 'pointer', aspectRatio: '4/3',
                      outline: i === imgIdx ? '2px solid var(--terracotta)' : 'none',
                      outlineOffset: 2, opacity: i === imgIdx ? 1 : 0.75,
                      transition: 'opacity 0.2s, outline-offset 0.2s',
                    }}
                  >
                    <img src={src}/>
                  </div>
                ))}
              </div>
              <button onClick={() => setLightbox(true)} style={{
                marginTop: 10, background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-mono)', fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.15em', color: 'var(--brown-soft)',
              }}>
                Ver {room.gallery.length} fotos →
              </button>
            </div>

            {/* Booking card */}
            <aside>
              <div style={{ background: 'var(--ink)', color: 'var(--cream)', padding: 24, borderRadius: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <div className="display" style={{ fontSize: 36, fontWeight: 500 }}>
                    {formatCOP(room.price)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>/ noche</div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>IGV incluido · Cancelación gratis 72h antes</div>

                <hr style={{ border: 'none', height: 1, background: 'rgba(246,239,227,0.14)', margin: '18px 0' }}/>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12 }}>
                  {[
                    ['Tamaño', `${room.size} m²`],
                    ['Huéspedes', `${room.capacity}`],
                    ['Camas', room.beds],
                    ['Vista', room.view],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="mono" style={{ fontSize: 9, opacity: 0.55 }}>{k}</div>
                      <div style={{ marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <button className="ch-btn sol" onClick={() => onBook(room.id)}
                  style={{ width: '100%', marginTop: 20, padding: '14px', justifyContent: 'center' }}>
                  Reservar →
                </button>

                <a
                  href={`https://wa.me/51900000000?text=${encodeURIComponent('Hola! Me interesa la ' + room.name + ' (' + (sede?.short || '') + ')')}`}
                  target="_blank" rel="noopener"
                  style={{ display: 'block', textAlign: 'center', marginTop: 10,
                    background: 'rgba(37,211,102,0.15)', color: '#25d366',
                    padding: '10px', borderRadius: 4, fontSize: 12, textDecoration: 'none',
                  }}
                >
                  💬 Consultar por WhatsApp
                </a>
              </div>
            </aside>
          </div>

          {/* Descripción + Features + Amenidades en 2 columnas bajo galería */}
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }} className="ch-room-grid">
            <div>
              <h2 className="display" style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 500, marginTop: 0, marginBottom: 12 }}>
                Sobre esta habitación
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--brown)', margin: 0 }}>{room.desc}</p>

              {/* Características en lista densa */}
              <div style={{ marginTop: 28 }}>
                <div className="mono" style={{ marginBottom: 10, color: 'var(--brown-soft)', fontSize: 10 }}>
                  CARACTERÍSTICAS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 20px' }}>
                  {room.features.map((f) => (
                    <div key={f} style={{ padding: '6px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--terracotta)', fontSize: 10 }}>◆</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mono" style={{ marginBottom: 10, color: 'var(--brown-soft)', fontSize: 10 }}>
                AMENIDADES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {room.amenities.map(a => (
                  <span key={a} style={{ padding: '6px 10px', border: '1px solid var(--line)', fontSize: 11, borderRadius: 4 }}>
                    {a}
                  </span>
                ))}
              </div>

              {/* Contacto WhatsApp compacto */}
              <div style={{ marginTop: 24, padding: 16, background: 'var(--cream-2)', borderRadius: 4 }}>
                <div className="mono" style={{ marginBottom: 6, color: 'var(--brown-soft)', fontSize: 10 }}>
                  ¿DUDAS?
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  Escríbenos por WhatsApp
                </div>
                <a href="https://wa.me/51900000000" target="_blank" rel="noopener"
                  className="display" style={{ fontSize: 18, fontWeight: 500, marginTop: 4, color: 'var(--ink)', textDecoration: 'none', display: 'block' }}
                >
                  +51 900 · 000 · 000
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,20,16,0.94)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <button onClick={() => setLightbox(false)} style={{
            position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none',
            color: 'var(--cream)', fontSize: 28, cursor: 'pointer', width: 44, height: 44,
          }}>×</button>
          <button onClick={(e) => { e.stopPropagation(); setImgIdx((imgIdx - 1 + room.gallery.length) % room.gallery.length); }}
            style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(246,239,227,0.12)', border: 'none', color: 'var(--cream)',
              width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>‹</button>
          <img src={room.gallery[imgIdx]} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()}/>
          <button onClick={(e) => { e.stopPropagation(); setImgIdx((imgIdx + 1) % room.gallery.length); }}
            style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(246,239,227,0.12)', border: 'none', color: 'var(--cream)',
              width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>›</button>
          <div className="mono" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', color: 'var(--cream)', opacity: 0.7 }}>
            {imgIdx + 1} / {room.gallery.length}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RoomsListPage, RoomDetailPage });
