import { create } from 'zustand'
import { SessionType } from '@/lib/session';
import { persist, createJSONStorage } from 'zustand/middleware'


interface AuthState {
  session: SessionType | null;
  setSession: (data: SessionType) => void;
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
}


export const useAuth = create(
  persist<AuthState>(
    (set, get) => ({
     loading: true,
      setLoading: (isLoading) => set((state)=>({ loading: isLoading })),
      session: null,
      setSession: (data: SessionType | null) => set(state=>({session:data}))
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)