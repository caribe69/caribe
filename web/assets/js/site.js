/* ─────────────────────────────────────────────────────────────
   Sol Caribe · landing estática conectada al sistema del hotel
   Reemplaza los datos que antes venían de Laravel/MySQL por los
   de /api/public/landing (sedes y habitaciones reales con fotos).
   ───────────────────────────────────────────────────────────── */
(function () {
  // En caribeperu.com con /api proxeado al backend, deja API_BASE = ''.
  const API_BASE = '';
  // Número por defecto; se sobreescribe con el de "Página web → Contacto".
  let WA_PHONE = '51975494595';
  const PLACEHOLDER = 'assets/img/placeholder-habitacion.png';

  let SEDES = [];
  let ROOMS = [];
  let filtroSede = 'all';

  const money = (n) => 'S/ ' + Number(n || 0).toFixed(2);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const waLink = (txt) => `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(txt)}`;

  // ── Tarjeta de habitación-maqueta (con galería de fotos) ──
  function roomCard(r) {
    const fotos = (r.hasRealPhotos && r.fotos && r.fotos.length) ? r.fotos : [PLACEHOLDER];
    const stars = 5;
    const consulta = waLink(`Hola, me interesa la ${r.name || 'habitación'} en ${r.sedeNombre || ''}.`);
    const precioNoche = (r.precioNoche != null ? String(r.precioNoche) : '').trim();
    const precioHora = (r.precioHora != null ? String(r.precioHora) : '').trim();
    const thumbs = fotos.slice(0, 5);
    return `
    <div class="room-card group relative flex flex-col bg-white opacity-100 shadow-sm hover:shadow-2xl border border-slate-100 overflow-hidden transition-all duration-500 radius-lg">
      <div class="relative m-3 h-52 overflow-hidden radius-default">
        <img src="${esc(fotos[0])}" onerror="this.src='${PLACEHOLDER}'" alt="${esc(r.name)}"
             class="room-main w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
        ${fotos.length > 1 ? `<span class="top-3 right-3 z-20 absolute flex items-center gap-1 bg-black/55 backdrop-blur-md px-2.5 py-1 rounded-full font-bold text-[10px] text-white">
          <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 002.25 8.25v9A2.25 2.25 0 004.5 19.5z"/></svg>
          ${fotos.length}</span>` : ''}
        ${r.capacidad ? `<div class="top-3 left-3 z-20 absolute flex items-center gap-1.5 bg-white/70 shadow-sm backdrop-blur-md px-3 py-1 border border-white/20 rounded-full font-bold text-[10px] text-slate-800">
          <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
          ${esc(r.capacidad)}</div>` : ''}
      </div>
      ${thumbs.length > 1 ? `<div class="flex gap-1.5 px-3 mb-1">
        ${thumbs.map((p, i) => `<button type="button" data-src="${esc(p)}" class="room-thumb w-12 h-10 overflow-hidden radius-default border ${i === 0 ? 'border-sol-red' : 'border-slate-200'} shrink-0">
          <img src="${esc(p)}" onerror="this.src='${PLACEHOLDER}'" class="w-full h-full object-cover" alt=""></button>`).join('')}
      </div>` : ''}
      <div class="flex flex-col flex-grow spacing-card-p pt-0">
        <div class="flex flex-col spacing-subtitle-mb">
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-slate-800 group-hover:text-sol-red leading-tight tracking-tight transition-colors h4">${esc(r.name)}</h3>
          </div>
          <div class="flex items-center gap-3 mt-2">
            <p class="flex items-center gap-1.5 font-bold text-[9px] text-slate-600 uppercase leading-none tracking-widest">
              <svg class="size-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
              ${esc(r.sedeNombre || '')}
            </p>
            ${r.camas ? `<div class="bg-slate-300 rounded-full w-1 h-1"></div>
            <p class="flex items-center gap-1.5 font-bold text-[9px] text-slate-600 uppercase leading-none tracking-widest">${esc(r.camas)}</p>` : ''}
          </div>
          ${(r.desc || r.descripcion) ? `<div class="mt-3"><p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">${esc(r.desc || r.descripcion)}</p></div>` : ''}
          ${(r.features && r.features.length) ? `<div class="flex flex-wrap gap-1.5 mt-3">
            ${r.features.slice(0, 5).map((f) => `<span class="inline-flex items-center bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-medium text-[9px] text-slate-600">${esc(f)}</span>`).join('')}
          </div>` : ''}
          ${(precioNoche || precioHora) ? `<div class="group/price relative bg-slate-50 mt-6 p-4 border border-slate-100 overflow-hidden radius-default">
            <div class="top-0 right-0 absolute bg-sol-red/5 -mt-8 -mr-8 rounded-full w-24 h-24"></div>
            <div class="top-0 right-0 left-0 absolute bg-gradient-to-r from-sol-gold via-sol-gold/50 to-transparent h-0.5"></div>
            <div class="z-10 relative flex flex-col gap-1">
              ${precioNoche ? `<div class="flex items-end gap-2"><span class="font-black text-slate-800 text-xl leading-none tracking-tight">${esc(precioNoche)}</span></div>` : ''}
              ${precioHora ? `<div class="flex items-center gap-1.5 mt-1">
                <div class="inline-flex items-center gap-1.5 bg-sol-gold/5 px-2 py-1 border border-sol-gold/10 rounded-md font-bold text-[9px] text-sol-gold uppercase tracking-widest">
                  <span class="bg-sol-gold rounded-full w-1 h-1"></span> Por hora: ${esc(precioHora)}</div></div>` : ''}
            </div>
            <p class="z-10 relative mt-2 font-bold text-[8px] text-slate-500 uppercase leading-none tracking-widest">Precio por noche</p>
          </div>` : ''}
        </div>
        <div class="flex justify-between items-center gap-4 mt-auto pt-4">
          <div class="flex items-center gap-0.5">
            ${Array.from({ length: 5 }).map((_, i) => `<svg class="size-3.5 ${i < stars ? 'text-sol-gold' : 'text-slate-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`).join('')}
          </div>
          <a href="${consulta}" target="_blank" rel="noopener" class="relative bg-slate-900 hover:bg-sol-red shadow-lg px-5 py-3 rounded-xl font-black text-[10px] text-white uppercase tracking-[0.1em] transition-all duration-300 no-underline">Consultar</a>
        </div>
      </div>
    </div>`;
  }

  function filtroBtn(label, value) {
    const active = filtroSede === value;
    return `<button type="button" data-sede="${esc(value)}"
      class="flex-none btn btn-sm btn-pill ${active ? 'btn-primary' : 'btn-light'}">${esc(label)}</button>`;
  }

  function roomsGrid() {
    // El grid de habitaciones es el que está en la misma sección que la
    // barra de filtros por sede (.no-scrollbar). Fallback: primer grid.
    const bar = document.querySelector('.no-scrollbar');
    const sec = bar && bar.closest('section');
    return (sec && sec.querySelector('.spacing-grid-gap')) ||
           document.querySelector('.spacing-grid-gap');
  }

  function renderRooms() {
    const grid = roomsGrid();
    if (!grid) return;
    const list = filtroSede === 'all' ? ROOMS : ROOMS.filter((r) => String(r.sedeId) === filtroSede);
    grid.innerHTML = list.length
      ? list.map(roomCard).join('')
      : `<div class="col-span-full bg-white py-20 border border-slate-200 border-dashed text-center radius-lg">
           <p class="font-medium text-slate-500">No hay habitaciones para este destino.</p></div>`;
    // Galería: al tocar una miniatura, cambia la foto principal de esa tarjeta.
    grid.querySelectorAll('.room-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.room-card');
        const main = card && card.querySelector('.room-main');
        if (main && btn.dataset.src) main.src = btn.dataset.src;
        if (card) card.querySelectorAll('.room-thumb').forEach((t) =>
          t.classList.toggle('border-sol-red', t === btn));
        if (card) card.querySelectorAll('.room-thumb').forEach((t) =>
          t.classList.toggle('border-slate-200', t !== btn));
      });
    });
  }

  function renderFiltros() {
    // Reemplaza la barra de filtros por sede (los botones con data-sede o wire:click)
    const cont = document.querySelector('.no-scrollbar');
    if (!cont) return;
    let html = filtroBtn('Todos', 'all');
    SEDES.forEach((s) => { html += filtroBtn(s.nombre, String(s.id)); });
    cont.innerHTML = html;
    cont.querySelectorAll('button[data-sede]').forEach((b) =>
      b.addEventListener('click', () => { filtroSede = b.dataset.sede; renderFiltros(); renderRooms(); }));
  }

  function wireBookingForm() {
    const form = document.querySelector('form');
    if (!form) return;
    // Rellena el <select> de sede con las sedes reales
    const selects = form.querySelectorAll('select');
    if (selects[0]) {
      selects[0].innerHTML = '<option value="">Destino</option>' +
        SEDES.map((s) => `<option value="${esc(s.nombre)}">${esc(s.nombre)}</option>`).join('');
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const get = (sel) => (form.querySelector(sel) || {}).value || '';
      const nombre = get('input[type="text"]');
      const correo = get('input[type="email"]');
      const cel = get('input[type="tel"]');
      const sede = selects[0] ? selects[0].value : '';
      const fecha = get('input[type="date"]');
      const pax = selects[1] ? selects[1].value : '';
      const txt = `Hola, quiero reservar en Hs Sol Caribe.\n` +
        `Nombre: ${nombre}\nCorreo: ${correo}\nCelular: ${cel}\nSede: ${sede}\nLlegada: ${fecha}\nHuéspedes: ${pax}`;
      window.open(waLink(txt), '_blank', 'noopener');
    });
  }

  // ── Carrusel (hero) desde la API ──
  function slideHTML(s) {
    const img = s.imagen || PLACEHOLDER;
    const benef = (s.beneficios || []).filter(Boolean);
    return `
    <div class="relative swiper-slide">
      <div class="absolute inset-0">
        <img src="${esc(img)}" class="w-full h-full object-cover" alt="${esc(s.titulo || 'Sol Caribe')}">
        <div class="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent"></div>
      </div>
      <div class="z-10 relative flex items-center mx-auto px-4 lg:px-8 h-full container">
        <div class="items-center gap-12 grid lg:grid-cols-2 mx-auto pt-[100px] w-full max-w-[90%]">
          <div class="z-10 relative w-full">
            <div class="relative w-full backdrop-blur-lg bg-slate-950/45 border border-white/10 p-6 sm:p-8 rounded-sol-default shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-xl">
              ${s.precio ? `<div class="absolute -top-6 -right-6 z-20 flex items-center justify-center bg-gradient-to-br from-sol-red to-sol-orange text-white font-black text-center shadow-[0_8px_25px_rgba(185,28,28,0.4)] w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/10 ring-4 ring-sol-red/20 rotate-6">
                <div class="flex flex-col items-center justify-center leading-none"><span class="text-[9px] uppercase tracking-widest">PROMO</span><span class="text-sm sm:text-base font-extrabold mt-0.5">OFERTA</span></div></div>` : ''}
              ${s.subtitulo ? `<div class="inline-flex items-center gap-2 bg-sol-gold/10 backdrop-blur-md px-3 py-1.5 border border-sol-gold/20 rounded-full mb-4">
                <span class="flex bg-sol-gold rounded-full w-1.5 h-1.5 animate-ping"></span>
                <span class="font-bold text-sol-gold uppercase text-[9px] tracking-widest leading-none">${esc(s.subtitulo)}</span></div>` : ''}
              ${s.titulo ? `<div class="mb-4"><h2 class="font-bold text-white text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-tight">${esc(s.titulo)}</h2></div>` : ''}
              ${s.descripcion ? `<div class="mb-5"><p class="text-slate-200 text-sm sm:text-base leading-relaxed font-light">${esc(s.descripcion)}</p></div>` : ''}
              ${s.precio ? `<div class="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-sol-sm mb-5 w-fit">
                <span class="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Tarifa Especial:</span>
                <span class="text-xl font-black text-sol-orange">${esc(s.precio)}</span></div>` : ''}
              ${benef.length ? `<div class="mb-6 border-t border-white/10 pt-4"><ul class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-200 text-xs sm:text-sm font-medium">
                ${benef.map((b) => `<li class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>${esc(b)}</span></li>`).join('')}
              </ul></div>` : ''}
              ${s.botonTexto ? `<div class="flex"><a href="${esc(s.botonUrl || '#habitaciones')}" class="btn btn-sun btn-pill px-8 py-3 !font-extrabold flex items-center gap-2"><span>${esc(s.botonTexto)}</span>
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg></a></div>` : ''}
            </div>
          </div>
          <div class="hidden lg:block"></div>
        </div>
      </div>
    </div>`;
  }

  // ── Datos de contacto (WhatsApp, correo, dirección) desde la API ──
  function renderContacto(c) {
    if (!c) return;
    if (c.whatsapp) {
      WA_PHONE = String(c.whatsapp).replace(/\D/g, '') || WA_PHONE;
      // Reescribe todos los enlaces de WhatsApp ya existentes en la página
      document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com"]').forEach((a) => {
        a.href = a.href.replace(/(wa\.me\/|phone=)\d+/, '$1' + WA_PHONE);
      });
    }
    const tel = document.getElementById('contacto-telefono');
    if (tel && (c.whatsapp || c.telefono)) {
      const num = (c.whatsapp || c.telefono).replace(/\D/g, '');
      tel.textContent = '+' + num;
    }
    const mail = document.getElementById('contacto-email');
    if (mail && c.email) {
      mail.href = 'mailto:' + c.email;
      mail.textContent = c.email;
    }
    const dir = document.getElementById('contacto-direccion');
    if (dir && c.direccion) {
      dir.textContent = c.direccion;
      if (c.mapsUrl && dir.parentElement) {
        // Convierte la dirección en enlace al mapa si hay URL
        dir.innerHTML = '<a href="' + esc(c.mapsUrl) + '" target="_blank" rel="noopener" class="hover:text-sol-gold transition-colors">' + esc(c.direccion) + '</a>';
      }
    }
  }

  function renderSlides(slides) {
    if (!Array.isArray(slides) || slides.length === 0) return; // conserva los de la web si no hay
    const container = document.querySelector('.swiper'); // el primero es el hero
    if (!container || !window.Swiper) return;
    const wrapper = container.querySelector('.swiper-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = slides.map(slideHTML).join('');
    try { container.swiper && container.swiper.destroy(true, true); } catch (e) {}
    // eslint-disable-next-line no-new
    new window.Swiper(container, {
      effect: 'fade',
      fadeEffect: { crossFade: true },
      loop: slides.length > 1,
      autoplay: { delay: 8000, disableOnInteraction: false },
      pagination: { el: container.parentElement.querySelector('.swiper-pagination') || '.swiper-pagination', clickable: true },
    });
  }

  fetch(API_BASE + '/api/public/landing')
    .then((r) => r.json())
    .then((data) => {
      SEDES = Array.isArray(data.sedes) ? data.sedes : [];
      ROOMS = Array.isArray(data.rooms) ? data.rooms : [];
      renderContacto(data.contacto);
      renderFiltros();
      renderRooms();
      wireBookingForm();
      // Espera un momento para que Alpine/Swiper hayan montado el hero, y lo reemplaza
      setTimeout(() => renderSlides(data.slides), 400);
    })
    .catch((err) => console.warn('No se pudo cargar /api/public/landing', err));
})();
