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
  setAuth: (token: string, usuario: UsuarioInfo) => void;
  setActiveSede: (id: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      activeSedeId: null,
      setAuth: (token, usuario) =>
        set({ token, usuario, activeSedeId: usuario.sedeId ?? null }),
      setActiveSede: (id) => set({ activeSedeId: id }),
      logout: () => set({ token: null, usuario: null, activeSedeId: null }),
    }),
    { name: 'hotel-auth' },
  ),
);
