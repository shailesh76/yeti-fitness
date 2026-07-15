import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://drkurkhsmjuixccdblrl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRya3Vya2hzbWp1aXhjY2RibHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUwNjYsImV4cCI6MjA5ODA0MTA2Nn0.pb7ee-RwIDgLJQ91RihHUgPycg22ZnAwQwD5smRuMx8';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
