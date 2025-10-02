import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase credentials not configured");
  }

  if (!supabaseClient) {
    // Use service role key to bypass RLS for server-side operations
    supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseClient;
}

export async function uploadImageToStorage(
  base64Data: string,
  fileName: string,
): Promise<string> {
  const supabase = getSupabaseClient();

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, "base64");

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("generated-images")
    .upload(fileName, buffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("generated-images").getPublicUrl(data.path);

  return publicUrl;
}
