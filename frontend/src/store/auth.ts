import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Rol =
  | 'SUPERADMIN'
  | 'ADMIN_SEDE'
  | 'HOTELERO'
  | 'LIMPIEZA'
  | 'CAJERO';

export interface UsuarioInfo {
  id: number;
  nombre: string;
  username: string;
  email?: string | null;
  rol: Rol;
  sedeId: number | null;
  sede: { id: number; nombre: string } | null;
}

interface AuthState {
  token: string | null;
  usuario: UsuarioInfo | null;
  activeSedeId: number | null;
  tokenExp: number | null; // unix seconds — expiración del JWT
  setAuth: (token: string, usuario: UsuarioInfo) => void;
  setActiveSede: (id: number) => void;
  logout: () => void;
}

// Decodifica el payload de un JWT sin verificar la firma (solo para leer exp).
function readJwtExp(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    return typeof data.exp === 'number' ? data.exp : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      activeSedeId: null,
      tokenExp: null,
      setAuth: (token, usuario) =>
        set({
          token,
          usuario,
          activeSedeId: usuario.sedeId ?? null,
          tokenExp: readJwtExp(token),
        }),
      setActiveSede: (id) => set({ activeSedeId: id }),
      logout: () =>
        set({ token: null, usuario: null, activeSedeId: null, tokenExp: null }),
    }),
    { name: 'hotel-auth' },
  ),
);
