import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/utils/constants';

interface AuthContextType {
  user: User | null;
  profile: { id: string; name: string; phone: string; role: UserRole | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, signOut: async () => {}, refreshProfile: async () => {} });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);
  const authSubscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null>(null);
  const profileFetchTimeoutRef = useRef<number | null>(null);
  // Track the latest user id to avoid stale profile fetches
  const latestUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    // Only proceed if this is still the current user
    if (latestUserIdRef.current !== userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    // Check again after await
    if (latestUserIdRef.current !== userId) return;
    if (data) {
      setProfile({ id: data.id, name: data.name ?? '', phone: data.phone ?? '', role: (data.role as UserRole | null) });
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (authSubscriptionRef.current) return;

    // Restore session from storage FIRST
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      latestUserIdRef.current = currentUser?.id ?? null;

      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Then listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        latestUserIdRef.current = currentUser?.id ?? null;

        if (profileFetchTimeoutRef.current !== null) {
          window.clearTimeout(profileFetchTimeoutRef.current);
          profileFetchTimeoutRef.current = null;
        }

        if (currentUser) {
          // Keep loading=true until profile is fetched to prevent premature routing
          setLoading(true);
          profileFetchTimeoutRef.current = window.setTimeout(() => {
            fetchProfile(currentUser.id).then(() => {
              setUser(currentUser);
              setLoading(false);
            });
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    authSubscriptionRef.current = subscription;

    return () => {
      if (profileFetchTimeoutRef.current !== null) {
        window.clearTimeout(profileFetchTimeoutRef.current);
        profileFetchTimeoutRef.current = null;
      }

      authSubscriptionRef.current?.unsubscribe();
      authSubscriptionRef.current = null;
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    const userId = latestUserIdRef.current;
    if (userId) {
      await fetchProfile(userId);
    }
  }, [fetchProfile]);

  const signOut = async () => {
    latestUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
