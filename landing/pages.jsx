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
// BookingFlow — 4 pasos
// ─────────────────────────────────────────────────────────────
function BookingFlow({ preselectedRoom, onDone }) {
  const [step, setStep] = React.useState(1);
  const [dates, setDates] = React.useState({ start: new Date(2026, 5, 12), end: new Date(2026, 5, 18) });
  const [roomId, setRoomId] = React.useState(preselectedRoom || null);
  const [guest, setGuest] = React.useState({ name: '', email: '', phone: '', notes: '' });
  const [payment, setPayment] = React.useState({ card: '', cvv: '', exp: '', name: '' });

  const room = ROOMS.find(r => r.id === roomId);
  const nights = Math.round((dates.end - dates.start) / 86400000);
  const subtotal = room ? room.price * nights : 0;
  const taxes = Math.round(subtotal * 0.19);
  const total = subtotal + taxes;

  const fmt = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

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
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 60 }}>
          <div>
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
                <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                  <div>
                    <label className="ch-label">Nombre completo</label>
                    <input className="ch-input" value={guest.name} onChange={e => setGuest({...guest, name: e.target.value})} placeholder="Como aparece en tu cédula"/>
                  </div>
                  <div>
                    <label className="ch-label">Correo</label>
                    <input className="ch-input" value={guest.email} onChange={e => setGuest({...guest, email: e.target.value})} placeholder="tu@correo.com"/>
                  </div>
                  <div>
                    <label className="ch-label">Teléfono</label>
                    <input className="ch-input" value={guest.phone} onChange={e => setGuest({...guest, phone: e.target.value})} placeholder="+57 ___ ___ ____"/>
                  </div>
                  <div>
                    <label className="ch-label">País</label>
                    <input className="ch-input" defaultValue="Colombia"/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ch-label">Solicitudes especiales (opcional)</label>
                    <textarea className="ch-input" rows="3" value={guest.notes} onChange={e => setGuest({...guest, notes: e.target.value})}
                      placeholder="Cuna, piso alto, llegada tarde, etc." style={{ resize: 'none' }}/>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="display" style={{ fontSize: 56, fontWeight: 400, margin: 0 }}>
                  Datos de <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>pago.</span>
                </h2>
                <p style={{ fontSize: 14, color: 'var(--brown)', marginTop: 20 }}>
                  Cancelación gratis hasta 72h antes del check-in. Solo se cobra la primera noche al reservar.
                </p>
                <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ch-label">Número de tarjeta</label>
                    <input className="ch-input" value={payment.card} onChange={e => setPayment({...payment, card: e.target.value})} placeholder="0000 0000 0000 0000"/>
                  </div>
                  <div>
                    <label className="ch-label">Vencimiento</label>
                    <input className="ch-input" value={payment.exp} onChange={e => setPayment({...payment, exp: e.target.value})} placeholder="MM / AA"/>
                  </div>
                  <div>
                    <label className="ch-label">CVV</label>
                    <input className="ch-input" value={payment.cvv} onChange={e => setPayment({...payment, cvv: e.target.value})} placeholder="•••"/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ch-label">Nombre en la tarjeta</label>
                    <input className="ch-input" value={payment.name} onChange={e => setPayment({...payment, name: e.target.value})}/>
                  </div>
                </div>
              </div>
            )}

            {/* Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, paddingTop: 30, borderTop: '1px solid var(--line)' }}>
              {step > 1 ? (
                <button className="ch-btn" onClick={() => setStep(step - 1)}>← Anterior</button>
              ) : <div/>}
              {step < 4 ? (
                <button className="ch-btn terracotta" onClick={() => setStep(step + 1)}
                  disabled={step === 2 && !roomId}
                  style={{ opacity: (step === 2 && !roomId) ? 0.4 : 1 }}>
                  Continuar →
                </button>
              ) : (
                <button className="ch-btn terracotta" onClick={() => onDone({ room, dates, guest, total })}>
                  Confirmar reserva
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
                      <span style={{ opacity: 0.7 }}>Impuestos (19%)</span>
                      <span>{formatCOP(taxes)}</span>
                    </div>
                  </div>
                  <hr style={{ border: 'none', height: 1, background: 'rgba(246,239,227,0.14)', margin: '24px 0' }}/>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span className="mono" style={{ opacity: 0.7 }}>Total</span>
                    <span className="display" style={{ fontSize: 32, fontWeight: 500 }}>{formatCOP(total)}</span>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BookingConfirmed({ booking, onHome }) {
  return (
    <section style={{ minHeight: 'calc(100vh - 78px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: 48 }}>
      <div style={{ maxWidth: 640, textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 120, color: 'var(--terracotta)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1 }}>✓</div>
        <h1 className="display" style={{ fontSize: 64, fontWeight: 400, margin: '20px 0' }}>
          Tu reserva está <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>confirmada.</span>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--brown)', margin: '24px 0 40px' }}>
          Te enviamos un correo con los detalles. Nos vemos pronto en el Rodadero.
        </p>
        {booking && booking.room && (
          <div style={{ padding: 32, background: 'var(--cream-2)', marginBottom: 40, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
              <span className="mono" style={{ color: 'var(--brown-soft)' }}>Reserva</span>
              <span className="mono">HS-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span>
            </div>
            <div className="display" style={{ fontSize: 24, margin: '8px 0' }}>{booking.room.name}</div>
            <div className="mono" style={{ color: 'var(--brown-soft)' }}>Total {formatCOP(booking.total)}</div>
          </div>
        )}
        <button className="ch-btn primary" onClick={onHome}>Volver al inicio</button>
      </div>
    </section>
  );
}

Object.assign(window, { GalleryPage, AmenitiesPage, ContactPage, BookingFlow, BookingConfirmed });
