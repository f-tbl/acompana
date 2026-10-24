import "server-only";
import { createClient } from "@supabase/supabase-js";
import { CLIPS_BUCKET } from "@/lib/config";

let admin: ReturnType<typeof createClient> | null = null;

/** Cliente con service role: solo en el servidor (firma URLs del bucket privado de clips). */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  admin ??= createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

export async function urlDeSubida(path: string) {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(CLIPS_BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error("createSignedUploadUrl", error);
    return null;
  }
  return { path: data.path, token: data.token };
}

export async function urlsDeClips(paths: string[]) {
  const sb = supabaseAdmin();
  const out = new Map<string, string>();
  if (!sb || paths.length === 0) return out;
  const { data, error } = await sb.storage.from(CLIPS_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) {
    console.error("createSignedUrls", error);
    return out;
  }
  for (const d of data) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}
