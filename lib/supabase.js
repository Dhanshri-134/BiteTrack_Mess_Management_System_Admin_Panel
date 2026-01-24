import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or ANON key missing. Check .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// https://vhnhtypxvpwagghunnjr.supabase.co/storage/v1/object/public/mess-stamps/official_stamp.jpeg.jpg
// https://vhnhtypxvpwagghunnjr.supabase.co/storage/v1/object/mess-stamps/1768933596533_official_stamp.jpeg.jpg