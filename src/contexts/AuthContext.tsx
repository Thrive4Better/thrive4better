import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

// ── Logging utility ──
const LOG_PREFIX = '[Auth]';
function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}
function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  carerId: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  role: UserRole;
  carerId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  log('Fetching profile for user:', userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, carer_id, avatar_url, phone')
    .eq('id', userId)
    .single();

  if (error) {
    logError('Profile fetch failed:', error.message, error.code, error.details);
    return null;
  }
  if (!data) {
    logError('Profile fetch returned no data for user:', userId);
    return null;
  }
  log('Profile loaded:', { role: data.role, fullName: data.full_name });
  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role || 'staff',
    carerId: data.carer_id,
    avatarUrl: data.avatar_url,
    phone: data.phone,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      const p = await fetchProfile(u.id);
      setProfile(p);
    } catch (err) {
      logError('loadProfile crashed:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    log('Initializing auth...');

    supabase.auth
      .getSession()
      .then(async ({ data: { session: s }, error }) => {
        if (!mounted) return;
        if (error) {
          logError('getSession error:', error.message);
          setLoading(false);
          return;
        }
        log('Session found:', !!s, s?.user?.email ?? 'no user');
        setSession(s);
        setUser(s?.user ?? null);
        await loadProfile(s?.user ?? null);
        if (mounted) setLoading(false);
      })
      .catch((err) => {
        logError('getSession crashed:', err);
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      log('Auth state changed:', event, newSession?.user?.email ?? 'no user');
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      await loadProfile(newSession?.user ?? null);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    log('Signing in:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logError('Sign in failed:', error.message);
      throw error;
    }
    log('Sign in successful');
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    log('Signing up:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      logError('Sign up failed:', error.message);
      throw error;
    }
    log('Sign up successful');
  };

  const verifyOtp = async (email: string, token: string) => {
    log('Verifying OTP for:', email);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) {
      logError('OTP verification failed:', error.message);
      throw error;
    }
    log('OTP verified');
  };

  const signOut = async () => {
    log('Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('Sign out failed:', error.message);
      throw error;
    }
    setProfile(null);
    log('Signed out');
  };

  const refreshProfile = async () => {
    await loadProfile(user);
  };

  const role: UserRole = profile?.role ?? 'staff';
  const carerId = profile?.carerId ?? null;

  return (
    <AuthContext.Provider
      value={{ user, session, loading, profile, role, carerId, signIn, signUp, signOut, verifyOtp, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
