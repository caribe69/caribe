// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — componentes compartidos
// Nav · Footer · WhatsAppFab (estilo Sol Caribe Premium)
// ─────────────────────────────────────────────────────────────

function Logo({ size = 40, showText = true, textColor = '#ffffff' }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={HOTEL.logo}
        alt="Hs Sol Caribe"
        style={{ width: size, height: size }}
        className="object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
      />
      {showText && (
        <div style={{ color: textColor }} className="leading-tight">
          <div className="font-bold text-base tracking-tight" style={{ fontFamily: 'Inter' }}>
            Hs Sol Caribe
          </div>
          <div className="text-[10px] mt-0.5 opacity-70 uppercase tracking-[0.15em]">
            Hotel · 3★
          </div>
        </div>
      )}
    </div>
  );
}

function Stars({ count = 5, size = 14, colorClass = 'text-[#d4af37]' }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="currentColor"
          className={colorClass}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Nav — header transparente → opaco al scrollear, logo grande → chico
// ─────────────────────────────────────────────────────────────
function Nav({ current, onNavigate }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.pageYOffset > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const links = [
    { id: 'home',      label: 'Inicio',       active: current === 'home' },
    { id: 'rooms',     label: 'Habitaciones', active: current === 'rooms' || current === 'room' },
    { id: 'sedes',     label: 'Sedes',        active: current === 'sedes' || current === 'sede' },
    { id: 'amenities', label: 'Servicios',    active: current === 'amenities' },
    { id: 'gallery',   label: 'Galería',      active: current === 'gallery' },
    { id: 'contact',   label: 'Contacto',     active: current === 'contact' },
  ];

  const go = (id) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <>
      <header
        className={`z-[5000] fixed top-0 left-0 right-0 border-b transition-all duration-700 ease-in-out ${
          scrolled
            ? 'bg-black/60 backdrop-blur-2xl border-white/10 shadow-2xl py-2'
            : 'bg-transparent border-white/0 py-4'
        }`}
      >
        <div className="container mx-auto">
          <div
            className={`flex justify-between items-center transition-all duration-700 ${
              scrolled ? 'h-16' : 'h-24 lg:h-28'
            }`}
          >
            {/* Logo */}
            <a
              onClick={() => go('home')}
              className="flex items-center cursor-pointer flex-shrink-0"
            >
              <img
                src={HOTEL.logo}
                alt="Hs Sol Caribe"
                className={`object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-700 ${
                  scrolled ? 'h-12 md:h-14' : 'h-16 md:h-20 lg:h-24'
                }`}
              />
              <div className="ml-3 hidden sm:block leading-tight">
                <div className="text-white font-bold text-base tracking-tight">
                  Hs Sol Caribe
                </div>
                <div className="text-[9px] mt-0.5 text-white/70 uppercase tracking-[0.2em]">
                  Hotel · 3★
                </div>
              </div>
            </a>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-9 font-bold text-[10px] text-white uppercase tracking-[0.25em]">
              {links.map((l) => (
                <a
                  key={l.id}
                  onClick={() => go(l.id)}
                  className={`group relative cursor-pointer transition-colors ${
                    l.active ? 'text-[#d4af37]' : 'hover:text-[#d4af37]'
                  }`}
                >
                  {l.label}
                  <span
                    className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#d4af37] rounded-full transition-all duration-300 ${
                      l.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </a>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-5">
              <a
                onClick={() => go('contact')}
                className={`group flex items-center gap-3 backdrop-blur-md px-5 py-2.5 border rounded-full transition-all duration-500 cursor-pointer ${
                  current === 'contact'
                    ? 'border-[#d4af37] bg-[#d4af37]/20'
                    : 'bg-white/5 hover:bg-[#d4af37] border-white/20 hover:border-[#d4af37]'
                }`}
              >
                <span className="flex flex-shrink-0 justify-center items-center bg-[#d4af37] group-hover:bg-white shadow-sm rounded-full w-7 h-7 transition-colors duration-500">
                  <svg className="w-3.5 h-3.5 text-white group-hover:text-[#d4af37]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 2v.51l-8 6.22l-8-6.22V6zM4 18V9.04l7.39 5.74c.18.14.4.21.61.21s.43-.07.61-.21L20 9.03v8.96H4Z" />
                  </svg>
                </span>
                <span className="font-bold text-[10px] text-white uppercase tracking-wider">
                  Contáctanos
                </span>
              </a>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="focus:outline-none text-white"
                aria-label="Abrir menú"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden z-[6000] fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden left-0 z-[6001] fixed inset-y-0 bg-gradient-to-b from-[#0f0404] via-[#3b0909] to-[#3b0909] shadow-2xl w-3/4 max-w-sm overflow-y-auto transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-6 border-white/5 border-b">
          <img src={HOTEL.logo} alt={HOTEL.name} className="w-auto h-16 object-contain" />
          <button
            onClick={() => setMobileOpen(false)}
            className="bg-white/5 p-2 rounded-full text-white/60 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col space-y-5 p-6">
          {links.map((l) => (
            <a
              key={l.id}
              onClick={() => go(l.id)}
              className={`text-lg font-bold cursor-pointer transition-all ${
                l.active ? 'text-[#d4af37]' : 'text-white/80 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
          <hr className="border-white/10" />
          <a
            onClick={() => go('contact')}
            className="flex items-center gap-3 font-bold text-[#d4af37] cursor-pointer"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 2v.51l-8 6.22l-8-6.22V6zM4 18V9.04l7.39 5.74c.18.14.4.21.61.21s.43-.07.61-.21L20 9.03v8.96H4Z" />
            </svg>
            Contáctanos
          </a>
        </nav>

        <div className="p-6 mt-4">
          <a
            onClick={() => go('rooms')}
            className="btn btn-sun btn-pill py-3 w-full cursor-pointer text-center"
          >
            Reservar Ahora
          </a>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer — gradient rojo oscuro con detalles dorados
// ─────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear();
  const sedes = window.SEDES || [];
  const principal = sedes.find((s) => s.is_principal) || sedes[0];
  const direccion = principal?.address || principal?.direccion || 'Lima, Perú';
  const telefono = principal?.phone || principal?.telefono || '';
  const email = 'contacto@caribeperu.com';

  const goTo = (sec) => {
    try {
      window.dispatchEvent(new CustomEvent('hsc:navigate', { detail: sec }));
    } catch (e) {}
  };

  return (
    <footer className="relative bg-gradient-to-b from-[#0f0404] via-[#3b0909] to-[#3b0909] border-t border-[#5a0d0d] overflow-hidden">
      {/* Blurs decorativos */}
      <div className="top-0 right-0 absolute bg-white/[0.05] blur-[120px] rounded-full w-[500px] h-[500px] pointer-events-none" />
      <div className="bottom-0 left-0 absolute bg-[#d4af37]/[0.08] blur-[100px] rounded-full w-[400px] h-[400px] pointer-events-none" />
      <div className="bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent w-full h-px" />

      <div className="relative container mx-auto px-4 lg:px-8 pt-20 pb-16">
        <div className="gap-10 lg:gap-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center mb-5">
              <img
                src={HOTEL.logo}
                alt={HOTEL.name}
                className="drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] w-auto h-20 object-contain"
              />
            </div>
            <p className="mb-8 text-white/70 leading-relaxed small">
              Brindamos experiencias de hospedaje en Perú que combinan confort,
              ubicación estratégica y un servicio de alta calidad.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { url: 'https://wa.me/51999999999', label: 'WhatsApp', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347' },
                { url: 'https://www.facebook.com', label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                { url: 'https://instagram.com', label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex justify-center items-center bg-white/5 hover:bg-[#d4af37]/10 border border-white/10 hover:border-[#d4af37] rounded-full w-10 h-10 text-white/60 hover:text-[#d4af37] transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h4 className="mb-6 pl-3 border-[#d4af37] border-l-2 font-bold text-white text-sm uppercase tracking-widest">
              Navegación
            </h4>
            <ul className="space-y-3 small">
              {[
                { id: 'home', label: 'Inicio' },
                { id: 'rooms', label: 'Habitaciones' },
                { id: 'sedes', label: 'Sedes' },
                { id: 'amenities', label: 'Servicios' },
                { id: 'gallery', label: 'Galería' },
              ].map((l) => (
                <li key={l.id}>
                  <a
                    onClick={() => goTo(l.id)}
                    className="group flex items-center gap-1.5 text-white/60 hover:text-[#d4af37] transition-colors duration-200 cursor-pointer"
                  >
                    <span className="bg-[#d4af37] opacity-0 group-hover:opacity-100 rounded-full w-1 h-1 transition-opacity duration-200" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Información */}
          <div>
            <h4 className="mb-6 pl-3 border-[#d4af37] border-l-2 font-bold text-white text-sm uppercase tracking-widest">
              Información
            </h4>
            <ul className="space-y-3 small">
              <li><a onClick={() => goTo('contact')} className="group flex items-center gap-1.5 text-white/60 hover:text-[#d4af37] cursor-pointer transition-colors"><span className="bg-[#d4af37] opacity-0 group-hover:opacity-100 rounded-full w-1 h-1 transition-opacity" />Contáctanos</a></li>
              <li><a href="#" className="group flex items-center gap-1.5 text-white/60 hover:text-[#d4af37] transition-colors"><span className="bg-[#d4af37] opacity-0 group-hover:opacity-100 rounded-full w-1 h-1 transition-opacity" />Políticas de privacidad</a></li>
              <li><a href="#" className="group flex items-center gap-1.5 text-white/60 hover:text-[#d4af37] transition-colors"><span className="bg-[#d4af37] opacity-0 group-hover:opacity-100 rounded-full w-1 h-1 transition-opacity" />Términos y condiciones</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="mb-6 pl-3 border-[#d4af37] border-l-2 font-bold text-white text-sm uppercase tracking-widest">
              Contacto
            </h4>
            <div className="space-y-4 text-white/60 small">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 w-4 h-4 text-[#d4af37] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="leading-relaxed">{direccion}</p>
              </div>
              {telefono && (
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#d4af37] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <span>{telefono}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-[#d4af37] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 2v.51l-8 6.22l-8-6.22V6zM4 18V9.04l7.39 5.74c.18.14.4.21.61.21s.43-.07.61-.21L20 9.03v8.96H4Z" />
                </svg>
                <a href={`mailto:${email}`} className="text-white/60 hover:text-[#d4af37] transition-colors">
                  {email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative container mx-auto px-4 lg:px-8">
        <div className="flex md:flex-row flex-col justify-between items-center gap-4 py-8 border-t border-white/10">
          <p className="text-white/40 small">
            © {year} Sol Caribe. Todos los derechos reservados.
          </p>
          <p className="text-white/50 small">
            Desarrollado por <span className="font-bold text-[#d4af37] uppercase">Sol Caribe</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// WhatsAppFab — botón flotante de WhatsApp
// ─────────────────────────────────────────────────────────────
function WhatsAppFab() {
  const phone = '51999999999';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent('Hola, quiero información sobre Hs Sol Caribe.')}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp"
      className="fixed bottom-6 right-6 z-[4000] flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-[0_8px_25px_rgba(37,211,102,0.45)] transition-transform hover:scale-110"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
      <svg className="relative w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}

// Hook tweaks legacy (lo mantenemos vacío para no romper imports en index.html)
function useTweaks(defaults) {
  const [t] = React.useState(defaults || {});
  return [t, () => {}];
}
function TweaksPanel() { return null; }
function TweakSection() { return null; }
function TweakSelect() { return null; }
function TweakRadio() { return null; }

Object.assign(window, { Logo, Stars, Nav, Footer, WhatsAppFab, useTweaks, TweaksPanel, TweakSection, TweakSelect, TweakRadio });
