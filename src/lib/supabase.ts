import { createClient } from '@supabase/supabase-js';

// Use environment variables for production, fallback to hardcoded for development
// In production, set these in your hosting environment (Vercel, Firebase, etc.)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jgiaphfnaudnaqnldowm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnaWFwaGZuYXVkbmFxbmxkb3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzI5MTEsImV4cCI6MjA4MzY0ODkxMX0.zLNaJ1fAg4cSTyu2ZZenlYbz9C2NqhrkKBAnydR8XcU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
