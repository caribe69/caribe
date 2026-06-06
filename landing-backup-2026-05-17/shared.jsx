// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — componentes compartidos (estilo transaccional)
// ─────────────────────────────────────────────────────────────

function Logo({ size = 40, showText = true, textColor, onClick, inverted = false }) {
  const col = textColor || (inverted ? '#fff' : 'var(--ink)');
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }}>
      <img src={HOTEL.logo} alt="Hs Sol Caribe"
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: '50%', background: '#0a0a0a' }}/>
      {showText && (
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: col, letterSpacing: '0.01em', fontFamily: 'var(--f-sans)' }}>
            Hs Sol Caribe
          </div>
          <div style={{ fontSize: 10, marginTop: 3, color: col, opacity: 0.65, fontFamily: 'var(--f-sans)', letterSpacing: '0.05em' }}>
            HOTEL · 3★
          </div>
        </div>
      )}
    </div>
  );
}

function Stars({ count = 5, color = 'var(--cta)', size = 12 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 0.5l1.545 3.637 3.955 0.287-3.015 2.58 0.935 3.846L6 8.8 2.58 10.85l0.935-3.846L0.5 4.424l3.955-0.287z"/>
        </svg>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// BookingSummaryBar — la barra oscura arriba con fechas/huéspedes
// ─────────────────────────────────────────────────────────────
function BookingSummaryBar({ onEdit }) {
  return (
    <div style={{
      background: 'var(--navy)', color: '#fff',
      padding: '14px 48px',
      fontSize: 13,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: 'auto 1px 1fr 1fr 1.2fr 1fr', alignItems: 'center', gap: 24 }}>
        <a onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fff', cursor: 'pointer', opacity: 0.9, fontWeight: 500, whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3l-4 4 4 4"/></svg>
          Ver todos los hoteles en el área
        </a>
        <div style={{ height: 28, width: 1, background: 'rgba(255,255,255,0.2)' }}/>
        <Field label="Entrada" value="vie, 24 abr"/>
        <Field label="Salida" value="sáb, 25 abr"/>
        <Field label="Habitaciones y huéspedes" value="1 hab, 1 huésped"/>
        <Field label="Tarifa" value="Mejor disponible"/>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Nav — header superior (dark) + barra de hotel individual
// ─────────────────────────────────────────────────────────────
function Nav({ current, onNavigate }) {
  const tabs = [
    { id: 'home', label: 'Inicio' },
    { id: 'rooms', label: 'Habitaciones' },
    { id: 'sedes', label: 'Sedes' },
    { id: 'amenities', label: 'Servicios' },
    { id: 'contact', label: 'Contacto' },
  ];

  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`ed-nav ${scrolled ? 'ed-nav-scrolled' : ''}`}>
      <div className="ed-nav-row">
        <a className="ed-nav-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
          <img
            src="assets/logo.png"
            alt="Sol Caribe"
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', background: 'var(--ed-ink)' }}
          />
          <span>Sol <em style={{ color: 'var(--ed-gold)' }}>Caribe</em></span>
        </a>
        <nav className="ed-nav-tabs" aria-label="Main">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`ed-nav-tab ${current === t.id ? 'active' : ''}`}
              onClick={() => onNavigate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span className="ed-nav-lang">ES / EN</span>
          <button className="ed-btn ed-btn-dark" style={{ padding: '12px 22px', fontSize: 11 }} onClick={() => onNavigate('rooms')}>
            Reservar
            <svg className="ed-btn-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="ed-footer">
      <div className="ed-footer-inner">
        <div className="ed-footer-top">
          <div className="ed-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <img
                src="assets/logo.png"
                alt="Sol Caribe"
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.08)', padding: 4, border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <h3 style={{ margin: 0 }}>Sol <em style={{ fontStyle: 'italic', color: 'var(--ed-gold-soft)' }}>Caribe</em></h3>
            </div>
            <p>
              Tu hogar fuera de casa en el Caribe colombiano. Cuatro sedes
              frente al mar, once habitaciones y 39 años ininterrumpidos
              recibiendo a quienes buscan mar, sol y calma.
            </p>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Stars count={3} size={12} color="var(--ed-gold-soft)"/>
              <div style={{ fontFamily: 'var(--ed-fs-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'rgba(248,244,237,0.5)', textTransform: 'uppercase' }}>
                Hotel tres estrellas · RNT 84719
              </div>
            </div>
          </div>

          <div>
            <h4>Sedes</h4>
            <ul>
              <li><a>Rodadero · Santa Marta</a></li>
              <li><a>Cartagena de Indias</a></li>
              <li><a>San Andrés Isla</a></li>
              <li><a>Minca · Sierra Nevada</a></li>
            </ul>
          </div>

          <div>
            <h4>Reserva</h4>
            <ul>
              <li><a>Habitaciones</a></li>
              <li><a>Ofertas y tarifas</a></li>
              <li><a>Club de socios</a></li>
              <li><a>Administrar reserva</a></li>
            </ul>
          </div>

          <div>
            <h4>Contacto</h4>
            <ul>
              <li><a>+57 305 · 284 · 9123</a></li>
              <li><a>hola@solcaribe.co</a></li>
              <li><a>Instagram</a></li>
              <li><a>WhatsApp</a></li>
            </ul>
          </div>
        </div>
        <div className="ed-footer-bottom">
          <div>© 2026 Hs Sol Caribe · Todos los derechos reservados</div>
          <div>Santa Marta · Cartagena · San Andrés · Minca</div>
          <div>Diseñado con cariño en el Caribe ✦</div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// DateRangePicker
// ─────────────────────────────────────────────────────────────
function DatePicker({ startDate, endDate, onChange, onClose }) {
  const [viewDate, setViewDate] = React.useState(new Date(2026, 5, 1));
  const [selecting, setSelecting] = React.useState('start');
  const [hoverDate, setHoverDate] = React.useState(null);

  const monthName = (d) => d.toLocaleDateString('es', { month: 'long', year: 'numeric' });

  const renderMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = (first.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return { label: monthName(date), days };
  };

  const toTime = (d) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null;

  const handleClick = (d) => {
    if (!d) return;
    if (selecting === 'start' || (startDate && d < startDate)) {
      onChange({ start: d, end: null });
      setSelecting('end');
    } else {
      if (d.getTime() === startDate.getTime()) return;
      onChange({ start: startDate, end: d });
      setSelecting('start');
      onClose && setTimeout(onClose, 200);
    }
  };

  const inRange = (d) => {
    if (!d) return false;
    const t = toTime(d);
    const s = toTime(startDate);
    const e = toTime(endDate || (selecting === 'end' ? hoverDate : null));
    if (!s || !e) return false;
    return t >= Math.min(s,e) && t <= Math.max(s,e);
  };
  const isEdge = (d) => {
    if (!d) return false;
    const t = toTime(d);
    return t === toTime(startDate) || t === toTime(endDate);
  };

  const month1 = renderMonth(viewDate);
  const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  const month2 = renderMonth(nextMonth);

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 12,
      background: '#fff', padding: 28, zIndex: 100,
      boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
      border: '1px solid var(--line)', borderRadius: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          style={{ background: 'var(--cream-2)', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--ink)', borderRadius: 4 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3l-4 4 4 4"/></svg>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Elige fechas</div>
        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          style={{ background: 'var(--cream-2)', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--ink)', borderRadius: 4 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3l4 4-4 4"/></svg>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }} onMouseLeave={() => setHoverDate(null)}>
        {[month1, month2].map((m, mi) => (
          <div key={mi}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, textAlign: 'center', textTransform: 'capitalize' }}>{m.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {['L','M','X','J','V','S','D'].map(d => (
                <div key={d} style={{ fontSize: 10, textAlign: 'center', padding: 6, color: 'var(--text-soft)', fontWeight: 600, textTransform: 'uppercase' }}>{d}</div>
              ))}
              {m.days.map((d, i) => {
                const range = inRange(d);
                const edge = isEdge(d);
                const today = new Date(); today.setHours(0,0,0,0);
                const past = d && d < today;
                return (
                  <button key={i} disabled={!d || past}
                    onClick={() => handleClick(d)}
                    onMouseEnter={() => d && setHoverDate(d)}
                    style={{
                      aspectRatio: '1', border: 'none',
                      background: edge ? 'var(--navy)' : (range ? 'var(--cream-2)' : 'transparent'),
                      color: edge ? '#fff' : (past ? 'rgba(30,20,16,0.2)' : 'var(--ink)'),
                      cursor: (!d || past) ? 'default' : 'pointer',
                      fontSize: 13, fontFamily: 'var(--f-sans)', fontWeight: edge ? 700 : 500,
                      borderRadius: edge ? 4 : 0,
                      transition: 'background 0.1s',
                    }}>
                    {d ? d.getDate() : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SearchBar — caja inline tipo "Modify search" Choice style
// ─────────────────────────────────────────────────────────────
function SearchBar({ variant = 'floating', onSearch }) {
  const [start, setStart] = React.useState(new Date(2026, 5, 12));
  const [end, setEnd] = React.useState(new Date(2026, 5, 18));
  const [guests, setGuests] = React.useState({ adults: 2, kids: 0, rooms: 1 });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [guestsOpen, setGuestsOpen] = React.useState(false);

  const fmt = (d) => d ? d.toLocaleDateString('es', { day: 'numeric', month: 'short', weekday: 'short' }) : '—';
  const nights = start && end ? Math.round((end - start) / 86400000) : 0;

  return (
    <div style={{
      background: '#fff',
      padding: '14px 16px',
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1.2fr 1.2fr auto',
      gap: 10,
      alignItems: 'end',
      border: '1px solid var(--line)',
      borderRadius: 6,
    }}>
      <div style={{ padding: '8px 14px', borderRight: '1px solid var(--line)', cursor: 'pointer', position: 'relative' }}
        onClick={() => { setPickerOpen(!pickerOpen); setGuestsOpen(false); }}>
        <div className="ch-label">Check-in / Check-out</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>
          {fmt(start)} <span style={{ color: 'var(--text-soft)', margin: '0 6px' }}>→</span> {fmt(end)}
        </div>
      </div>

      <div style={{ padding: '8px 14px', borderRight: '1px solid var(--line)' }}>
        <div className="ch-label">Noches</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          {nights || 0} <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 400 }}>{nights === 1 ? 'noche' : 'noches'}</span>
        </div>
      </div>

      <div style={{ padding: '8px 14px', cursor: 'pointer', position: 'relative' }}
        onClick={() => { setGuestsOpen(!guestsOpen); setPickerOpen(false); }}>
        <div className="ch-label">Huéspedes</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          {guests.adults + guests.kids} <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 400 }}>huéspedes · {guests.rooms} hab</span>
        </div>
        {guestsOpen && (
          <div onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 12,
              background: '#fff', padding: 20, border: '1px solid var(--line)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100, borderRadius: 6,
            }}>
            {[
              { key: 'adults', label: 'Adultos', min: 1 },
              { key: 'kids', label: 'Niños', min: 0 },
              { key: 'rooms', label: 'Habitaciones', min: 1 },
            ].map(({key, label, min}) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: key !== 'rooms' ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => setGuests({ ...guests, [key]: Math.max(min, guests[key] - 1) })}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontSize: 15 }}>−</button>
                  <div style={{ fontSize: 14, fontWeight: 600, width: 18, textAlign: 'center' }}>{guests[key]}</div>
                  <button onClick={() => setGuests({ ...guests, [key]: guests[key] + 1 })}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontSize: 15 }}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button className="ch-btn cta" style={{ padding: '14px 26px', fontSize: 14, height: '100%' }}
          onClick={() => onSearch && onSearch({ start, end, guests })}>
          Buscar
        </button>
      </div>

      {pickerOpen && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}>
          <DatePicker startDate={start} endDate={end}
            onChange={({start, end}) => { setStart(start); if (end) setEnd(end); }}
            onClose={() => setPickerOpen(false)} />
        </div>
      )}
    </div>
  );
}

function formatCOP(n) {
  // Format as Peruvian Soles: S/ 165
  return 'S/ ' + n.toLocaleString('es-PE');
}

// ─────────────────────────────────────────────────────────────
// Icon — librería mínima estilo lucide inline (reemplaza emojis)
// ─────────────────────────────────────────────────────────────
const ICON_PATHS = {
  bed: '<path d="M2 4v16M22 4v16M2 10h20M2 17h20M6 10V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4"/>',
  ruler: '<path d="M21 3L3 21M16 8l2 2M13 11l2 2M10 14l2 2M7 17l2 2"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>',
  mountain: '<path d="M8 3l4 8 5-5 5 15H2L8 3z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  whatsapp: '<path d="M17.6 14.2c-.3-.2-1.8-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-1 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5 0-.2 0-.3 0-.5 0-.1-.6-1.5-.9-2-.2-.5-.5-.4-.6-.4-.2 0-.4 0-.6 0-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5 0 1.4 1.1 2.8 1.2 3 .1.2 2 3.1 4.9 4.4 2.4 1 2.9.8 3.4.8.5 0 1.6-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.5-.3z"/><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" fill="none" stroke-linejoin="round"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  tv: '<rect x="2" y="5" width="20" height="13" rx="1.5"/><path d="M8 21h8"/>',
  shower: '<path d="M4 4h4v4M8 4l12 12M16 20v-4M12 20v-2M20 20v-4"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
};

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.8, className = '', style = {} }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

Object.assign(window, {
  Logo, Stars, Nav, Footer, DatePicker, SearchBar, BookingSummaryBar,
  formatCOP, Icon, ICON_PATHS,
});
