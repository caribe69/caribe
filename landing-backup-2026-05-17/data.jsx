// ─────────────────────────────────────────────────────────────
// Hs Sol Caribe — datos compartidos
// Los arrays se llenan desde /api/public/landing en app.jsx.
// Aquí solo queda HOTEL (config estático del logo/marca).
// ─────────────────────────────────────────────────────────────

const HOTEL = {
  name: 'Hs Sol Caribe',
  nameDisplay: 'Sol Caribe',
  nameSub: 'Hs',
  location: 'Perú',
  tagline: 'Tu Hogar Fuera De Casa',
  stars: 3,
  logo: 'assets/logo.png',
};

// Se llenan dinámicamente desde el backend (window.SEDES.push / window.ROOMS.push en app.jsx)
const SEDES = [];
const ROOMS = [];
const AMENITIES = [];
const GALLERY = [];
const TESTIMONIALS = [];
const EXPERIENCES = [];

Object.assign(window, {
  HOTEL, SEDES, ROOMS, AMENITIES, GALLERY, TESTIMONIALS, EXPERIENCES,
});
