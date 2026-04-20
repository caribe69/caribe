import { create } from 'zustand';

interface PresenceState {
  online: Set<number>;
  setList: (ids: number[]) => void;
  addOnline: (id: number) => void;
  removeOnline: (id: number) => void;
  isOnline: (id: number) => boolean;
}

export const usePresence = create<PresenceState>((set, get) => ({
  online: new Set<number>(),
  setList: (ids) => set({ online: new Set(ids) }),
  addOnline: (id) =>
    set((s) => {
      const n = new Set(s.online);
      n.add(id);
      return { online: n };
    }),
  removeOnline: (id) =>
    set((s) => {
      const n = new Set(s.online);
      n.delete(id);
      return { online: n };
    }),
  isOnline: (id) => get().online.has(id),
}));
