import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export async function getOrCreateAnonymousUser(): Promise<User | null> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("Failed to create anonymous user:", error);
      return null;
    }

    return data.user;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
