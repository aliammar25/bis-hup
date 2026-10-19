// Service layer: pages only call these functions.
// With VITE_SUPABASE_* set it reads from Supabase; otherwise it uses mock data.
import * as mock from "../data/mock.js";
import { supabase } from "../lib/supabase.js";

const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 200));

async function q(table, build) {
  const { data, error } = await build(supabase.from(table).select("*"));
  if (error) throw error;
  return data;
}
const bySubject = (sid) => (query) => (sid ? query.eq("subject_id", Number(sid)) : query);

export const getSubjects = () =>
  supabase ? q("subjects", (x) => x.order("id")) : delay(mock.subjects);

export const getSubject = async (id) =>
  supabase
    ? (await q("subjects", (x) => x.eq("id", Number(id)).limit(1)))[0] ?? null
    : delay(mock.subjects.find((s) => s.id === Number(id)) ?? null);

export const getLectures = (sid) =>
  supabase
    ? q("lectures", (x) => bySubject(sid)(x).order("week_number"))
    : delay(mock.lectures.filter((l) => !sid || l.subject_id === Number(sid)));

export const getTasks = (sid) =>
  supabase
    ? q("tasks", (x) => bySubject(sid)(x).order("due_date"))
    : delay(mock.tasks.filter((t) => !sid || t.subject_id === Number(sid)));

export const getTimetable = () =>
  supabase ? q("timetable", (x) => x.order("id")) : delay(mock.timetable);

// ---------- Admin writes (RLS enforces admin-only in the database) ----------
export const listAll = (table) => q(table, (x) => x.order("id"));

export async function saveRow(table, row) {
  const { id, created_at, ...rest } = row;
  const { error } = id
    ? await supabase.from(table).update(rest).eq("id", id)
    : await supabase.from(table).insert(rest);
  if (error) throw error;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// export async function uploadFile(file) {
//   const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
//   const { error } = await supabase.storage.from("files").upload(path, file);
//   if (error) throw error;
//   return supabase.storage.from("files").getPublicUrl(path).data.publicUrl;
// }

export async function uploadFile(file) {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  if (!file) {
    throw new Error("لم يتم اختيار ملف.");
  }

  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("files")
    .upload(path, file, {
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(
      error.message || error.error || JSON.stringify(error) || "خطأ غير معروف أثناء رفع الملف"
    );
  }

  const { data: publicData } = supabase.storage
    .from("files")
    .getPublicUrl(data.path);

  if (!publicData?.publicUrl) {
    throw new Error("تم رفع الملف لكن تعذّر إنشاء رابط له.");
  }

  return publicData.publicUrl;
}
