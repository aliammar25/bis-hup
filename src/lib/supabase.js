
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && key ? createClient(url, key) : null;

// إنشاء جلسة مجهولة للزائر بدون إيميل أو باسورد
export async function ensureAnonymousSession() {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (session?.user) {
    return session.user;
  }

  const { data, error } =
    await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("تعذر إنشاء جلسة للزائر.");
  }

  return data.user;
}
