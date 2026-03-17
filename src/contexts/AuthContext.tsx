import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';
import type { Permission } from '@/lib/permissions';
import toast from 'react-hot-toast';

// ── Logging utility ──
const LOG_PREFIX = '[Auth]';
function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}
function logError(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

// ── Session timeout constants ──
const INACTIVITY_WARNING_MS = 25 * 60 * 1000; // 25 minutes
const INACTIVITY_SIGNOUT_MS = 30 * 60 * 1000; // 30 minutes

interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  carerId: string | null;
  avatarUrl: string | null;
  phone: string | null;
  permissions: Permission[] | null;
  isActive: boolean;
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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, carer_id, avatar_url, phone, permissions, is_active')
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
      permissions: data.permissions ?? null,
      isActive: data.is_active !== false, // default true if column doesn't exist yet
    };
  } catch (err) {
    logError('Profile fetch crashed:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  // ── Session timeout tracking ──
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetActivityTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (signoutTimerRef.current) clearTimeout(signoutTimerRef.current);

    // Only set timers if user is logged in
    if (!user) return;

    // Warning timer at 25 minutes
    warningTimerRef.current = setTimeout(() => {
      if (user) {
        warningShownRef.current = true;
        toast('Session expiring in 5 minutes. Click anywhere to stay signed in.', {
          duration: 10000,
          icon: '\u23F0',
          style: { background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' },
        });
      }
    }, INACTIVITY_WARNING_MS);

    // Auto sign-out timer at 30 minutes
    signoutTimerRef.current = setTimeout(async () => {
      if (user) {
        log('Session timed out due to inactivity');
        toast.error('Session expired due to inactivity');
        try {
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          setSession(null);
        } catch (err) {
          logError('Auto sign-out failed:', err);
        }
      }
    }, INACTIVITY_SIGNOUT_MS);
  }, [user]);

  // Listen for user activity to reset timers
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      resetActivityTimers();
    };

    // Debounce: only reset on first event in a 5-second window
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledHandler = () => {
      if (throttleTimer) return;
      handleActivity();
      throttleTimer = setTimeout(() => { throttleTimer = null; }, 5000);
    };

    window.addEventListener('click', throttledHandler);
    window.addEventListener('keypress', throttledHandler);
    window.addEventListener('mousemove', throttledHandler);
    window.addEventListener('scroll', throttledHandler);

    // Start the initial timers
    resetActivityTimers();

    return () => {
      window.removeEventListener('click', throttledHandler);
      window.removeEventListener('keypress', throttledHandler);
      window.removeEventListener('mousemove', throttledHandler);
      window.removeEventListener('scroll', throttledHandler);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (signoutTimerRef.current) clearTimeout(signoutTimerRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, resetActivityTimers]);

  useEffect(() => {
    let mounted = true;
    log('Initializing auth...');

    // Step 1: Get existing session (this is the ONLY initial load path)
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (!mounted) return;
      if (error) {
        logError('getSession error:', error.message);
        setLoading(false);
        initializedRef.current = true;
        return;
      }

      log('Session found:', !!s, s?.user?.email ?? 'no user');
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        if (mounted) setProfile(p);
      }

      if (mounted) {
        log('Auth initialization complete');
        initializedRef.current = true;
        setLoading(false);
      }
    }).catch((err) => {
      logError('getSession crashed:', err);
      if (mounted) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    // Step 2: Listen for FUTURE auth changes (sign in, sign out, token refresh)
    // Skip events that fire during initial load (INITIAL_SESSION, first SIGNED_IN)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      log('Auth state changed:', event, newSession?.user?.email ?? 'no user');
      if (!mounted) return;

      // Skip initial events — getSession handles the first load
      if (!initializedRef.current) {
        log('Skipping auth event during initialization:', event);
        return;
      }

      // Handle subsequent auth changes (login, logout, token refresh)
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const p = await fetchProfile(newSession.user.id);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    log('Signing in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logError('Sign in failed:', error.message);
      throw error;
    }
    log('Sign in successful');
    // Immediately set user/session and fetch profile (don't wait for onAuthStateChange)
    setSession(data.session);
    setUser(data.user);
    const p = await fetchProfile(data.user.id);
    setProfile(p);
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
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) {
      logError('OTP verification failed:', error.message);
      throw error;
    }
    log('OTP verified');
    if (data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      const p = await fetchProfile(data.user.id);
      setProfile(p);
    }
  };

  const signOut = async () => {
    log('Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('Sign out failed:', error.message);
      throw error;
    }
    setProfile(null);
    setUser(null);
    setSession(null);
    log('Signed out');
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
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
