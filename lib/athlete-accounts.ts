import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function ensureAthleteUser(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    return normalized;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === normalized);

  if (found) return found.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalized,
    password: crypto.randomUUID() + "A!1",
    email_confirm: true,
  });

  if (error) throw error;
  return data.user.id;
}

export async function getUserStatusByEmail(email: string): Promise<{ exists: boolean }> {
  const normalized = email.toLowerCase().trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    return { exists: false };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === normalized);
  return { exists: !!found };
}
