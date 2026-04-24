// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — router principal
// ─────────────────────────────────────────────────────────────

function VariationB({ onNavigateExternal }) {
  const [section, setSection] = React.useState('home');
  const [roomId, setRoomId] = React.useState(null);
  const [sedeId, setSedeId] = React.useState(null);
  const [booking, setBooking] = React.useState(null);
  const [liveData, setLiveData] = React.useState({ loaded: false });

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

  return (
    <div className="ch-root" style={{ minHeight: '100%' }}>
      <Nav current={section} onNavigate={(s) => go(s)} />
      {section === 'home' && (
        <>
          <HotelHero onNavigate={go}/>
          <BenefitBanner/>
          <RoomsBySede onRoomClick={(id) => go('room', id)} onSedeClick={(id) => go('sede', id)}/>
          <TestimonialsSection/>
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
