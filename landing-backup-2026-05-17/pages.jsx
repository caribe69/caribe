// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — Galería inmersiva, Amenidades, Reserva, Compare
// ─────────────────────────────────────────────────────────────

function GalleryPage() {
  const [filter, setFilter] = React.useState('all');
  const [lightbox, setLightbox] = React.useState(null);

  const cats = [
    { id: 'all', label: 'Todo' },
    { id: 'rooms', label: 'Habitaciones' },
    { id: 'pool', label: 'Piscina' },
    { id: 'dining', label: 'Comida' },
    { id: 'surroundings', label: 'Alrededores' },
  ];

  const images = [
    { src: ROOMS[10].img, cat: 'rooms', label: 'Suite Sol Caribe' },
    { src: AMENITIES[0].img, cat: 'pool', label: 'Piscina al aire libre' },
    { src: AMENITIES[2].img, cat: 'surroundings', label: 'Playa del Rodadero' },
    { src: ROOMS[7].img, cat: 'rooms', label: 'Junior Suite' },
    { src: AMENITIES[1].img, cat: 'dining', label: 'Desayuno criollo' },
    { src: ROOMS[5].img, cat: 'rooms', label: 'Doble Vista al Mar' },
    { src: GALLERY[2], cat: 'surroundings', label: 'Atardecer' },
    { src: ROOMS[9].img, cat: 'rooms', label: 'Suite Azotea' },
    { src: GALLERY[7], cat: 'surroundings', label: 'Mar Caribe' },
    { src: ROOMS[0].img, cat: 'rooms', label: 'Sencilla Estándar' },
    { src: GALLERY[0], cat: 'surroundings', label: 'Atardecer' },
    { src: ROOMS[3].img, cat: 'rooms', label: 'Triple Familiar' },
  ];

  const filtered = filter === 'all' ? images : images.filter(im => im.cat === filter);

  return (
    <div>
      <section style={{ padding: '100px 48px 40px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="mono" style={{ marginBottom: 24, color: 'var(--brown-soft)' }}>· Galería</div>
          <h1 className="display" style={{ fontSize: 'clamp(64px, 8vw, 120px)', lineHeight: 0.95, margin: 0, fontWeight: 400 }}>
            Una casa que<br/>
            <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>da gusto mirar.</span>
          </h1>
        </div>
      </section>

      <section style={{ padding: '40px 48px', background: 'var(--cream)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              style={{
                padding: '10px 20px', border: '1px solid ' + (filter === c.id ? 'var(--ink)' : 'var(--line)'),
                background: filter === c.id ? 'var(--ink)' : 'transparent',
                color: filter === c.id ? 'var(--cream)' : 'var(--ink)',
                fontFamily: 'var(--f-sans)', fontSize: 12, cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ padding: '48px 48px 140px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ columnCount: 3, columnGap: 16 }}>
            {filtered.map((im, i) => (
              <div key={i} onClick={() => setLightbox(i)}
                className="ch-img-wrap"
                style={{ marginBottom: 16, breakInside: 'avoid', cursor: 'zoom-in',
                  aspectRatio: i % 5 === 0 ? '3/4' : (i % 3 === 0 ? '4/3' : '1/1') }}>
                <img src={im.src} alt={im.label}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {lightbox !== null && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,20,16,0.94)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--cream)', fontSize: 28, cursor: 'pointer', width: 44, height: 44 }}>×</button>
          <img src={filtered[lightbox].src} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }}/>
          <div className="mono" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', color: 'var(--cream)' }}>
            {filtered[lightbox].label} · {lightbox + 1} / {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AmenitiesPage
// ─────────────────────────────────────────────────────────────
function AmenitiesPage({ onNavigate }) {
  return (
    <div>
      <section style={{ padding: '100px 48px 40px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="mono" style={{ marginBottom: 24, color: 'var(--brown-soft)' }}>· Servicios</div>
          <h1 className="display" style={{ fontSize: 'clamp(64px, 8vw, 120px)', lineHeight: 0.95, margin: 0, fontWeight: 400 }}>
            Servicios<br/>
            <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>para sentirte en casa.</span>
          </h1>
        </div>
      </section>

      <section style={{ padding: '60px 48px 100px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 48 }}>
            {AMENITIES.map((a, i) => (
              <div key={a.num} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>
                <div className="ch-img-wrap" style={{ aspectRatio: '4/5' }}>
                  <img src={a.img} alt={a.title}/>
                </div>
                <div style={{ padding: '12px 0' }}>
                  <div className="display" style={{ fontSize: 40, color: 'var(--terracotta)', fontStyle: 'italic', fontWeight: 300, marginBottom: 12 }}>· {a.num}</div>
                  <h3 className="display" style={{ fontSize: 32, fontWeight: 400, margin: '0 0 16px' }}>{a.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--brown)' }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '100px 48px', background: 'var(--cream-2)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 60 }}>
            <div>
              <div className="mono" style={{ marginBottom: 20, color: 'var(--brown-soft)' }}>· Experiencias</div>
              <h2 className="display" style={{ fontSize: 'clamp(44px, 4.5vw, 64px)', lineHeight: 1.05, margin: 0, fontWeight: 400 }}>
                Tours con<br/>
                <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>la gente del lugar.</span>
              </h2>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--brown)', maxWidth: 320 }}>
              Trabajamos con guías locales. Todo se puede reservar en la recepción.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--line)' }}>
            {EXPERIENCES.map(ex => (
              <div key={ex.title} style={{ padding: 32, background: 'var(--cream-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
                <div>
                  <h3 className="display" style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>{ex.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--brown)', marginTop: 10, maxWidth: 400 }}>{ex.desc}</p>
                  <div className="mono" style={{ marginTop: 14, color: 'var(--brown-soft)' }}>{ex.duration}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>Desde</div>
                  <div className="display" style={{ fontSize: 24, color: 'var(--terracotta)', fontWeight: 500, marginTop: 4 }}>{formatCOP(ex.price)}</div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>por persona</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Contact / Reserva
// ─────────────────────────────────────────────────────────────
function ContactPage() {
  const [sent, setSent] = React.useState(false);
  return (
    <div>
      <section style={{ padding: '100px 48px 60px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="mono" style={{ marginBottom: 24, color: 'var(--brown-soft)' }}>· Contacto</div>
          <h1 className="display" style={{ fontSize: 'clamp(64px, 8vw, 120px)', lineHeight: 0.95, margin: 0, fontWeight: 400 }}>
            Escríbenos,<br/>
            <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>contestamos rápido.</span>
          </h1>
        </div>
      </section>

      <section style={{ padding: '40px 48px 140px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
          <div>
            <div style={{ marginBottom: 40 }}>
              <div className="mono" style={{ marginBottom: 12, color: 'var(--brown-soft)' }}>Dirección</div>
              <div className="display" style={{ fontSize: 24, lineHeight: 1.4 }}>Calle 5 · No. 3-44<br/>El Rodadero, Santa Marta</div>
            </div>
            <div style={{ marginBottom: 40 }}>
              <div className="mono" style={{ marginBottom: 12, color: 'var(--brown-soft)' }}>Teléfono & WhatsApp</div>
              <div className="display" style={{ fontSize: 24 }}>+57 305 · 284 · 9123</div>
            </div>
            <div style={{ marginBottom: 40 }}>
              <div className="mono" style={{ marginBottom: 12, color: 'var(--brown-soft)' }}>Correo</div>
              <div className="display" style={{ fontSize: 24 }}>hola@solcaribe.co</div>
            </div>
            <div>
              <div className="mono" style={{ marginBottom: 12, color: 'var(--brown-soft)' }}>Recepción</div>
              <div style={{ fontSize: 14, lineHeight: 1.8 }}>24 horas · Todos los días</div>
            </div>
          </div>

          <div style={{ background: 'var(--cream-2)', padding: 48 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="display" style={{ fontSize: 40, fontStyle: 'italic', color: 'var(--terracotta)' }}>¡Recibido!</div>
                <p style={{ marginTop: 20, color: 'var(--brown)' }}>Te respondemos en máximo 12 horas.</p>
              </div>
            ) : (
              <div>
                <div className="display" style={{ fontSize: 28, marginBottom: 32 }}>Cuéntanos qué necesitas</div>
                <div style={{ marginBottom: 20 }}>
                  <label className="ch-label">Nombre</label>
                  <input className="ch-input" placeholder="Tu nombre"/>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="ch-label">Correo</label>
                  <input className="ch-input" placeholder="tu@correo.com"/>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="ch-label">Mensaje</label>
                  <textarea className="ch-input" rows="4" placeholder="¿En qué podemos ayudarte?" style={{ resize: 'none' }}/>
                </div>
                <button className="ch-btn terracotta" style={{ marginTop: 16 }} onClick={() => setSent(true)}>Enviar</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BookingFlow — 4 pasos con validación, animaciones y multi-método de pago
// ─────────────────────────────────────────────────────────────
function BookingFlow({ preselectedRoom, onDone }) {
  const [step, setStep] = React.useState(1);
  const [dates, setDates] = React.useState({ start: new Date(2026, 5, 12), end: new Date(2026, 5, 18) });
  const [roomId, setRoomId] = React.useState(preselectedRoom || null);
  const [guest, setGuest] = React.useState({ name: '', dni: '', email: '', phone: '', notes: '' });
  const [touched, setTouched] = React.useState({});
  const [payMethod, setPayMethod] = React.useState('card'); // card | yape | plin | transferencia | efectivo
  const [payment, setPayment] = React.useState({ card: '', cvv: '', exp: '', name: '' });
  const [stepAnim, setStepAnim] = React.useState('in');

  const room = ROOMS.find(r => r.id === roomId);
  const nights = Math.max(1, Math.round((dates.end - dates.start) / 86400000));
  const subtotal = room ? room.price * nights : 0;
  const igv = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + igv;
  const depositoNoche = room ? room.price : 0; // solo primera noche al reservar

  const fmt = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

  // Validaciones
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guest.email);
  const validPhone = /^[\d+\s()-]{7,}$/.test(guest.phone);
  const validName = guest.name.trim().length >= 3;
  const validDni = !guest.dni || /^\d{8,11}$/.test(guest.dni);
  const cardDigits = payment.card.replace(/\D/g, '');
  const cardBrand = detectCardBrand(cardDigits);
  const validCard = luhn(cardDigits) && cardDigits.length >= 13;
  const validExp = /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(payment.exp) && !isCardExpired(payment.exp);
  const validCvv = /^\d{3,4}$/.test(payment.cvv);
  const validPayName = payment.name.trim().length >= 3;

  const canAdvance = (s) => {
    if (s === 1) return nights >= 1;
    if (s === 2) return !!roomId;
    if (s === 3) return validName && validEmail && validPhone && validDni;
    if (s === 4) {
      if (payMethod === 'card') return validCard && validExp && validCvv && validPayName;
      return true; // otros métodos no requieren tarjeta
    }
    return false;
  };

  const goNext = () => {
    if (!canAdvance(step)) {
      setTouched({ ...touched, [step]: true });
      return;
    }
    setStepAnim('out');
    setTimeout(() => {
      setStep((s) => Math.min(4, s + 1));
      setStepAnim('in');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
  };
  const goPrev = () => {
    setStepAnim('out');
    setTimeout(() => {
      setStep((s) => Math.max(1, s - 1));
      setStepAnim('in');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
  };

  const steps = [
    { n: 1, label: 'Fechas' },
    { n: 2, label: 'Habitación' },
    { n: 3, label: 'Huésped' },
    { n: 4, label: 'Pago' },
  ];

  return (
    <div style={{ background: 'var(--cream)', minHeight: 'calc(100vh - 78px)' }}>
      {/* Progress */}
      <div style={{ padding: '40px 48px 20px', background: 'var(--cream)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="mono" style={{ marginBottom: 20, color: 'var(--brown-soft)' }}>· Reservación</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {steps.map((s, i) => (
              <div key={s.n} onClick={() => step > s.n && setStep(s.n)}
                style={{ flex: 1, cursor: step > s.n ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step >= s.n ? 'var(--terracotta)' : 'transparent',
                    border: '1px solid ' + (step >= s.n ? 'var(--terracotta)' : 'var(--line)'),
                    color: step >= s.n ? 'var(--cream)' : 'var(--brown-soft)',
                    fontFamily: 'var(--f-mono)', fontSize: 11,
                  }}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 400, color: step >= s.n ? 'var(--ink)' : 'var(--brown-soft)' }}>{s.label}</div>
                </div>
                <div style={{ height: 2, background: step > s.n ? 'var(--terracotta)' : (step === s.n ? 'var(--ink)' : 'var(--line)') }}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '60px 48px 120px' }}>
        <div className="ch-booking-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 60 }}>
          <div style={{
            opacity: stepAnim === 'out' ? 0 : 1,
            transform: stepAnim === 'out' ? 'translateY(10px)' : 'translateY(0)',
            transition: 'opacity 0.2s, transform 0.2s',
          }}>
            {step === 1 && (
              <div>
                <h2 className="display" style={{ fontSize: 56, fontWeight: 400, margin: 0 }}>
                  ¿Cuándo <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>llegas?</span>
                </h2>
                <p style={{ fontSize: 15, color: 'var(--brown)', marginTop: 20, lineHeight: 1.7 }}>
                  Estancia mínima de 2 noches. Check-in a las 15:00 · Check-out a las 12:00.
                </p>

                <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                  <div>
                    <div className="ch-label">Llegada</div>
                    <div className="display" style={{ fontSize: 28, textTransform: 'capitalize' }}>{fmt(dates.start)}</div>
                  </div>
                  <div>
                    <div className="ch-label">Salida</div>
                    <div className="display" style={{ fontSize: 28, textTransform: 'capitalize' }}>{fmt(dates.end)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 28, position: 'relative' }}>
                  <DatePicker startDate={dates.start} endDate={dates.end}
                    onChange={({ start, end }) => setDates({ start, end: end || dates.end })}
                    onClose={() => {}}/>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="display" style={{ fontSize: 56, fontWeight: 400, margin: 0 }}>
                  Elige tu <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>habitación.</span>
                </h2>
                <p style={{ fontSize: 15, color: 'var(--brown)', marginTop: 20 }}>
                  {nights} noches · {fmt(dates.start)} → {fmt(dates.end)}
                </p>
                <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {ROOMS.map(r => (
                    <div key={r.id} onClick={() => setRoomId(r.id)}
                      style={{
                        display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 20,
                        padding: 16, cursor: 'pointer', background: 'var(--cream-2)',
                        border: '2px solid ' + (roomId === r.id ? 'var(--terracotta)' : 'transparent'),
                        transition: 'border 0.2s',
                      }}>
                      <div className="ch-img-wrap" style={{ aspectRatio: '4/3' }}>
                        <img src={r.img}/>
                      </div>
                      <div>
                        <div className="mono" style={{ color: 'var(--brown-soft)' }}>{r.tier}</div>
                        <div className="display" style={{ fontSize: 22, marginTop: 4 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--brown)', marginTop: 6 }}>{r.size} m² · {r.beds} · {r.view}</div>
                      </div>
                      <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                        <div className="display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--terracotta)' }}>{formatCOP(r.price)}</div>
                        <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>por noche</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="display" style={{ fontSize: 56, fontWeight: 400, margin: 0 }}>
                  Datos del <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>huésped.</span>
                </h2>
                <p style={{ fontSize: 14, color: 'var(--brown)', marginTop: 16 }}>
                  Estos datos se usarán en la boleta o factura. Revísalos bien.
                </p>
                <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ch-label">Nombre completo *</label>
                    <input
                      className="ch-input"
                      value={guest.name}
                      onChange={e => setGuest({...guest, name: e.target.value})}
                      placeholder="Como aparece en tu DNI"
                      style={invalidStyle(touched[3] && !validName)}
                    />
                    {touched[3] && !validName && <ErrText>Mínimo 3 caracteres</ErrText>}
                  </div>
                  <div>
                    <label className="ch-label">DNI (opcional)</label>
                    <input
                      className="ch-input"
                      value={guest.dni}
                      onChange={e => setGuest({...guest, dni: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                      inputMode="numeric"
                      placeholder="8 dígitos"
                      style={invalidStyle(touched[3] && !validDni)}
                    />
                    {touched[3] && !validDni && <ErrText>Entre 8 y 11 dígitos</ErrText>}
                  </div>
                  <div>
                    <label className="ch-label">Teléfono *</label>
                    <input
                      className="ch-input"
                      value={guest.phone}
                      onChange={e => setGuest({...guest, phone: e.target.value})}
                      placeholder="+51 999 ___ ___"
                      style={invalidStyle(touched[3] && !validPhone)}
                    />
                    {touched[3] && !validPhone && <ErrText>Teléfono inválido</ErrText>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ch-label">Correo *</label>
                    <input
                      type="email"
                      className="ch-input"
                      value={guest.email}
                      onChange={e => setGuest({...guest, email: e.target.value})}
                      placeholder="tu@correo.com"
                      style={invalidStyle(touched[3] && !validEmail)}
                    />
                    {touched[3] && !validEmail && <ErrText>Correo electrónico inválido</ErrText>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ch-label">Solicitudes especiales (opcional)</label>
                    <textarea className="ch-input" rows="3" value={guest.notes} onChange={e => setGuest({...guest, notes: e.target.value})}
                      placeholder="Cuna, piso alto, llegada tarde, chocolates de bienvenida, etc." style={{ resize: 'none' }}/>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="display" style={{ fontSize: 56, fontWeight: 400, margin: 0 }}>
                  Elige tu <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>forma de pago.</span>
                </h2>
                <p style={{ fontSize: 14, color: 'var(--brown)', marginTop: 16, lineHeight: 1.7 }}>
                  Cancelación gratis hasta 72h antes del check-in. Solo se cobra <b>la primera noche (S/ {depositoNoche})</b> al reservar.
                </p>

                {/* Selector de métodos de pago */}
                <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
                  {[
                    { id: 'card', label: 'Tarjeta', sub: 'Visa · Mastercard' },
                    { id: 'yape', label: 'Yape', sub: 'QR al reservar' },
                    { id: 'plin', label: 'Plin', sub: 'QR al reservar' },
                    { id: 'transferencia', label: 'Transferencia', sub: 'BCP · BBVA · IBK' },
                    { id: 'efectivo', label: 'Efectivo', sub: 'Al llegar al hotel' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setPayMethod(m.id)} className="ch-pay-method"
                      style={{
                        padding: '14px 14px', textAlign: 'left', cursor: 'pointer',
                        background: payMethod === m.id ? 'var(--terracotta)' : 'var(--cream-2)',
                        color: payMethod === m.id ? 'var(--cream)' : 'var(--ink)',
                        border: 'none', borderRadius: 4, transition: 'all 0.2s',
                      }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{m.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Tarjeta */}
                {payMethod === 'card' && (
                  <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                    {/* Mock card preview */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{
                        padding: 24, borderRadius: 12, aspectRatio: '1.6',
                        maxWidth: 380, margin: '0 auto 24px',
                        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                        color: '#fff', position: 'relative', overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      }}>
                        <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                          {cardBrand || 'Card'}
                        </div>
                        <div style={{ marginTop: 48, fontFamily: 'var(--f-mono)', fontSize: 18, letterSpacing: 2 }}>
                          {formatCardNumber(payment.card) || '0000  0000  0000  0000'}
                        </div>
                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 10, textTransform: 'uppercase', opacity: 0.8 }}>
                          <div>
                            <div style={{ fontSize: 8, opacity: 0.6 }}>Titular</div>
                            <div style={{ fontSize: 12, marginTop: 2, letterSpacing: 0.5 }}>{payment.name || 'NOMBRE APELLIDO'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 8, opacity: 0.6 }}>Vence</div>
                            <div style={{ fontSize: 12, marginTop: 2 }}>{payment.exp || 'MM/AA'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="ch-label">Número de tarjeta *</label>
                      <input
                        className="ch-input"
                        value={formatCardNumber(payment.card)}
                        onChange={e => setPayment({...payment, card: e.target.value.replace(/\D/g, '').slice(0, 19)})}
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        style={invalidStyle(touched[4] && !validCard)}
                      />
                      {touched[4] && !validCard && <ErrText>Número de tarjeta inválido</ErrText>}
                    </div>
                    <div>
                      <label className="ch-label">Vencimiento *</label>
                      <input
                        className="ch-input"
                        value={payment.exp}
                        onChange={e => setPayment({...payment, exp: formatExp(e.target.value)})}
                        placeholder="MM / AA"
                        inputMode="numeric"
                        style={invalidStyle(touched[4] && !validExp)}
                      />
                      {touched[4] && !validExp && <ErrText>MM/AA · no expirada</ErrText>}
                    </div>
                    <div>
                      <label className="ch-label">CVV *</label>
                      <input
                        className="ch-input"
                        type="password"
                        value={payment.cvv}
                        onChange={e => setPayment({...payment, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                        placeholder="•••"
                        inputMode="numeric"
                        style={invalidStyle(touched[4] && !validCvv)}
                      />
                      {touched[4] && !validCvv && <ErrText>3 o 4 dígitos</ErrText>}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="ch-label">Nombre en la tarjeta *</label>
                      <input
                        className="ch-input"
                        value={payment.name}
                        onChange={e => setPayment({...payment, name: e.target.value.toUpperCase()})}
                        style={invalidStyle(touched[4] && !validPayName)}
                      />
                      {touched[4] && !validPayName && <ErrText>Requerido</ErrText>}
                    </div>
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--brown-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🔒 Pago encriptado SSL · No guardamos datos de tarjeta
                    </div>
                  </div>
                )}

                {/* Yape / Plin */}
                {(payMethod === 'yape' || payMethod === 'plin') && (
                  <div style={{ marginTop: 40, padding: 32, background: 'var(--cream-2)', borderRadius: 4, textAlign: 'center' }}>
                    <div className="mono" style={{ color: 'var(--brown-soft)', marginBottom: 16 }}>
                      {payMethod === 'yape' ? 'YAPE' : 'PLIN'} · SOL CARIBE
                    </div>
                    <div style={{ display: 'inline-block', padding: 16, background: '#fff', borderRadius: 8, marginBottom: 16 }}>
                      <div style={{
                        width: 180, height: 180,
                        background: `repeating-conic-gradient(${payMethod === 'yape' ? '#7b2cbf' : '#00b8a9'} 0 25%, #fff 0 50%)`,
                        backgroundSize: '20px 20px',
                        borderRadius: 4,
                      }}/>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>+51 999 888 777</div>
                    <div style={{ fontSize: 13, color: 'var(--brown)' }}>
                      Escanea el QR o usa el número. Monto: <b>S/ {depositoNoche}</b>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--brown-soft)', marginTop: 16 }}>
                      Tras pagar, confirmamos la reserva por WhatsApp en 5 min.
                    </div>
                  </div>
                )}

                {/* Transferencia */}
                {payMethod === 'transferencia' && (
                  <div style={{ marginTop: 32, display: 'grid', gap: 12 }}>
                    {[
                      { banco: 'BCP Cuenta Soles', numero: '194-1234567-0-89', cci: '002-194-001234567089-12' },
                      { banco: 'BBVA Cuenta Soles', numero: '0011-0123-0100123456', cci: '011-123-010012345678-12' },
                      { banco: 'Interbank Soles', numero: '123-300456789-1', cci: '003-123-030045678912-34' },
                    ].map(c => (
                      <div key={c.banco} style={{ padding: 16, background: 'var(--cream-2)', borderRadius: 4 }}>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--brown-soft)' }}>{c.banco}</div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 15, marginTop: 4 }}>{c.numero}</div>
                        <div style={{ fontSize: 10, color: 'var(--brown-soft)', marginTop: 4 }}>CCI interbancario: {c.cci}</div>
                      </div>
                    ))}
                    <div style={{ padding: 12, background: 'var(--terracotta)', color: 'var(--cream)', borderRadius: 4, fontSize: 13 }}>
                      Titular: <b>INVERSIONES HOTELERAS SOL CARIBE E.I.R.L.</b> · RUC 20608896709
                    </div>
                  </div>
                )}

                {/* Efectivo */}
                {payMethod === 'efectivo' && (
                  <div style={{ marginTop: 40, padding: 32, background: 'var(--cream-2)', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>💵</div>
                    <div className="display" style={{ fontSize: 24, marginBottom: 8 }}>Pago al llegar</div>
                    <div style={{ fontSize: 14, color: 'var(--brown)', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
                      Reservamos tu habitación sin adelanto. Pagas en efectivo al hacer check-in en el hotel.
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--brown-soft)', marginTop: 20 }}>
                      Te llamaremos para confirmar la hora de llegada.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, paddingTop: 30, borderTop: '1px solid var(--line)', gap: 12 }}>
              {step > 1 ? (
                <button className="ch-btn" onClick={goPrev}>← Anterior</button>
              ) : <div/>}
              {step < 4 ? (
                <button className="ch-btn terracotta" onClick={goNext}
                  style={{ opacity: canAdvance(step) ? 1 : 0.6, cursor: canAdvance(step) ? 'pointer' : 'not-allowed' }}>
                  Continuar →
                </button>
              ) : (
                <button
                  className="ch-btn terracotta"
                  onClick={() => {
                    if (!canAdvance(4)) { setTouched({ ...touched, 4: true }); return; }
                    onDone({ room, dates, guest, total, payMethod });
                  }}
                  style={{ opacity: canAdvance(4) ? 1 : 0.6, fontSize: 15 }}
                >
                  {payMethod === 'efectivo' ? 'Reservar sin adelanto →' : `Pagar S/ ${depositoNoche} y confirmar →`}
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside>
            <div style={{ position: 'sticky', top: 120, background: 'var(--ink)', color: 'var(--cream)', padding: 32 }}>
              <div className="mono" style={{ opacity: 0.6, marginBottom: 20 }}>Resumen</div>

              {room ? (
                <>
                  <div className="ch-img-wrap" style={{ aspectRatio: '4/3', marginBottom: 20 }}>
                    <img src={room.img}/>
                  </div>
                  <div className="display" style={{ fontSize: 24, marginBottom: 6 }}>{room.name}</div>
                  <div className="mono" style={{ opacity: 0.6, fontSize: 9 }}>{room.tier}</div>
                </>
              ) : (
                <div style={{ opacity: 0.5, fontStyle: 'italic', fontFamily: 'var(--f-display)', fontSize: 20 }}>
                  Selecciona una habitación
                </div>
              )}

              <hr style={{ border: 'none', height: 1, background: 'rgba(246,239,227,0.14)', margin: '24px 0' }}/>

              <div style={{ fontSize: 13, lineHeight: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.7 }}>Llegada</span>
                  <span style={{ textTransform: 'capitalize' }}>{fmt(dates.start)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.7 }}>Salida</span>
                  <span style={{ textTransform: 'capitalize' }}>{fmt(dates.end)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.7 }}>Noches</span>
                  <span>{nights}</span>
                </div>
              </div>

              {room && (
                <>
                  <hr style={{ border: 'none', height: 1, background: 'rgba(246,239,227,0.14)', margin: '24px 0' }}/>
                  <div style={{ fontSize: 13, lineHeight: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.7 }}>{formatCOP(room.price)} × {nights} noches</span>
                      <span>{formatCOP(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.7 }}>IGV (18%)</span>
                      <span>{formatCOP(igv)}</span>
                    </div>
                  </div>
                  <hr style={{ border: 'none', height: 1, background: 'rgba(246,239,227,0.14)', margin: '24px 0' }}/>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span className="mono" style={{ opacity: 0.7 }}>Total</span>
                    <span className="display" style={{ fontSize: 32, fontWeight: 500 }}>{formatCOP(total)}</span>
                  </div>
                  {step === 4 && payMethod !== 'efectivo' && (
                    <div style={{ marginTop: 18, padding: 12, background: 'rgba(201,90,61,0.15)', borderRadius: 4, fontSize: 12 }}>
                      <div className="mono" style={{ opacity: 0.7, fontSize: 9 }}>SE COBRA AHORA</div>
                      <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>{formatCOP(depositoNoche)}</div>
                      <div style={{ opacity: 0.7, fontSize: 11, marginTop: 2 }}>
                        Primera noche. El resto al check-in.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers y utilidades de validación para pagos
// ─────────────────────────────────────────────────────────────

function formatCardNumber(raw) {
  const digits = (raw || '').toString().replace(/\D/g, '').slice(0, 19);
  return digits.match(/.{1,4}/g)?.join('  ') || '';
}

function formatExp(raw) {
  const d = (raw || '').toString().replace(/\D/g, '').slice(0, 4);
  if (d.length < 3) return d;
  return d.slice(0, 2) + ' / ' + d.slice(2);
}

function isCardExpired(expStr) {
  const m = expStr.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  const now = new Date();
  const expDate = new Date(year, month, 0, 23, 59, 59); // último día del mes
  return expDate < now;
}

function detectCardBrand(digits) {
  if (!digits) return '';
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^(34|37)/.test(digits)) return 'AmEx';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover';
  if (/^3[0689]/.test(digits)) return 'Diners';
  return '';
}

// Algoritmo Luhn para validar número de tarjeta
function luhn(digits) {
  if (!digits || digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function invalidStyle(isInvalid) {
  return isInvalid ? { borderColor: '#c0392b', background: 'rgba(192,57,43,0.05)' } : {};
}

function ErrText({ children }) {
  return (
    <div style={{ fontSize: 11, color: '#c0392b', marginTop: 6, fontFamily: 'var(--f-sans)' }}>
      ⚠ {children}
    </div>
  );
}

function BookingConfirmed({ booking, onHome }) {
  const [copied, setCopied] = React.useState(false);
  const code = React.useMemo(
    () => 'HS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    [],
  );
  const fmt = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const waMsg = encodeURIComponent(
    `Hola! Confirmé mi reserva ${code} en Sol Caribe.${booking?.room ? ' Habitación: ' + booking.room.name : ''}${booking ? ' Total: S/ ' + booking.total : ''}`
  );

  return (
    <section style={{ minHeight: 'calc(100vh - 78px)', background: 'var(--cream)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Check animado */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 96, height: 96, margin: '0 auto', borderRadius: '50%',
            background: 'var(--terracotta)', color: 'var(--cream)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48,
            boxShadow: '0 12px 36px rgba(201,90,61,0.4)',
            animation: 'ch-pop 0.4s cubic-bezier(.34,1.56,.64,1)',
          }}>✓</div>
          <h1 className="display" style={{ fontSize: 56, fontWeight: 400, margin: '28px 0 12px', lineHeight: 1.1 }}>
            ¡Reserva <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>confirmada!</span>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--brown)', maxWidth: 500, margin: '0 auto' }}>
            Te enviamos un correo con todos los detalles. Te esperamos en Sol Caribe.
          </p>
        </div>

        {booking && booking.room && (
          <div style={{ background: 'var(--cream-2)', borderRadius: 4, overflow: 'hidden' }}>
            {/* Código grande */}
            <div style={{ padding: 24, borderBottom: '1px dashed var(--line)', textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--brown-soft)', letterSpacing: 2 }}>
                CÓDIGO DE RESERVA
              </div>
              <div
                onClick={copyCode}
                style={{
                  marginTop: 8, fontFamily: 'var(--f-mono)', fontSize: 28, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: 2, color: 'var(--ink)',
                  display: 'inline-flex', alignItems: 'center', gap: 12,
                }}
                title="Click para copiar"
              >
                {code}
                <span style={{ fontSize: 12, color: copied ? 'var(--terracotta)' : 'var(--brown-soft)' }}>
                  {copied ? '✓ copiado' : '📋'}
                </span>
              </div>
            </div>

            {/* Detalles */}
            <div style={{ padding: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, marginBottom: 20 }}>
                <div className="ch-img-wrap" style={{ aspectRatio: '1' }}>
                  <img src={booking.room.img}/>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>{booking.room.tier}</div>
                  <div className="display" style={{ fontSize: 22, marginTop: 4 }}>{booking.room.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--brown)', marginTop: 6 }}>
                    {booking.room.size} m² · {booking.room.beds}
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed var(--line)', margin: '16px 0' }}/>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>CHECK-IN</div>
                  <div style={{ marginTop: 4, textTransform: 'capitalize' }}>{fmt(booking.dates?.start)}</div>
                  <div style={{ fontSize: 10, color: 'var(--brown-soft)' }}>desde 15:00</div>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>CHECK-OUT</div>
                  <div style={{ marginTop: 4, textTransform: 'capitalize' }}>{fmt(booking.dates?.end)}</div>
                  <div style={{ fontSize: 10, color: 'var(--brown-soft)' }}>hasta 12:00</div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed var(--line)', margin: '16px 0' }}/>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>MÉTODO</div>
                  <div style={{ fontSize: 14, textTransform: 'uppercase', marginTop: 4 }}>
                    {booking.payMethod || 'Tarjeta'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--brown-soft)' }}>TOTAL</div>
                  <div className="display" style={{ fontSize: 28, color: 'var(--terracotta)', fontWeight: 500, marginTop: 4 }}>
                    {formatCOP(booking.total)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 32 }}>
          <a
            href={`https://wa.me/51900000000?text=${waMsg}`}
            target="_blank"
            rel="noopener"
            className="ch-btn"
            style={{ background: '#25d366', color: '#fff', textAlign: 'center', textDecoration: 'none' }}
          >
            💬 Confirmar por WhatsApp
          </a>
          <button className="ch-btn" onClick={() => window.print()}>
            🖨 Imprimir
          </button>
          <button className="ch-btn terracotta" onClick={onHome}>
            Volver al inicio
          </button>
        </div>

        {/* Próximos pasos */}
        <div style={{ marginTop: 40, padding: 24, background: 'rgba(201,90,61,0.08)', borderLeft: '3px solid var(--terracotta)' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--terracotta)', letterSpacing: 2, marginBottom: 8 }}>
            PRÓXIMOS PASOS
          </div>
          <ol style={{ fontSize: 13, color: 'var(--brown)', lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
            <li>Te enviamos el detalle a tu correo</li>
            <li>Guarda tu código de reserva (<b>{code}</b>)</li>
            <li>Día del check-in trae DNI + código</li>
            <li>Cualquier cambio, escríbenos por WhatsApp</li>
          </ol>
        </div>
      </div>

      <style>{`
        @keyframes ch-pop {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}

Object.assign(window, { GalleryPage, AmenitiesPage, ContactPage, BookingFlow, BookingConfirmed });
