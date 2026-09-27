import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tsqcbdyddenplswmagqd.supabase.co";
const supabasePublishableKey = "sb_publishable_OI8Ue4I0_JJZKD78LxHh1g_8khHcRfa";

export const isSupabaseConfigured = true;
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
