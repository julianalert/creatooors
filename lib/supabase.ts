import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Creator {
  id: number;
  url: string;
  platform?: 'instagram' | 'tiktok' | 'youtube';
  profile_data?: any; // JSONB field for scraped profile data
  scraped_at?: string;
  created_at?: string;
  updated_at?: string;
}
