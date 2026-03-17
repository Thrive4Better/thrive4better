import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing env vars:', {
    url: supabaseUrl ? '✓ set' : '✗ MISSING',
    key: supabaseAnonKey ? '✓ set' : '✗ MISSING'
  });
  throw new Error('Missing Supabase environment variables');
}

console.log('[Supabase] Connecting to:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Wrap a promise with a timeout. If the promise doesn't resolve within
 * `ms` milliseconds, reject with a timeout error.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)), ms),
    ),
  ]);
}
