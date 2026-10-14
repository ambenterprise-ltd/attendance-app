import { createClient } from '@supabase/supabase-js';

const rawUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
// Clean the URL in case it has trailing /rest/v1 or trailing slash
const supabaseUrl: string = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
