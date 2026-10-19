
import * as mock from "../data/mock.js";
import {
  supabase,
  ensureAnonymousSession,
} from "../lib/supabase.js";

const delay = (value) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(value)), 200)
  );

async function q(table, build) {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  const { data, error } = await build(
    supabase.from(table).select("*")
  );

  if (error) throw error;
  return data;
}

const bySubject = (subjectId) => (query) =>
  subjectId ? query.eq("subject_id", Number(subjectId)) : query;

// ---------- Subjects ----------

export const getSubjects = () =>
  supabase
    ? q("subjects", (query) => query.order("id"))
    : delay(mock.subjects);

export const getSubject = async (id) =>
  supabase
    ? (await q("subjects", (query) =>
        query.eq("id", Number(id)).limit(1)
      ))[0] ?? null
    : delay(
        mock.subjects.find(
          (subject) => subject.id === Number(id)
        ) ?? null
      );

// ---------- Lectures ----------

export const getLectures = (subjectId) =>
  supabase
    ? q("lectures", (query) =>
        bySubject(subjectId)(query).order("week_number")
      )
    : delay(
        mock.lectures.filter(
          (lecture) =>
            !subjectId ||
            lecture.subject_id === Number(subjectId)
        )
      );

// ---------- Tasks ----------

export const getTasks = (subjectId) =>
  supabase
    ? q("tasks", (query) =>
        bySubject(subjectId)(query).order("due_date")
      )
    : delay(
        mock.tasks.filter(
          (task) =>
            !subjectId ||
            task.subject_id === Number(subjectId)
        )
      );

// ---------- Timetable ----------

export const getTimetable = () =>
  supabase
    ? q("timetable", (query) => query.order("id"))
    : delay(mock.timetable);

// ---------- Admin reads and writes ----------

export const listAll = (table) =>
  q(table, (query) => query.order("id"));

export async function saveRow(table, row) {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  const { id, created_at, ...rest } = row;

  if (table === "section_tasks") {
    const sectionId = String(rest.section_id ?? "").trim();

    if (!sectionId) {
      throw new Error("اختار السكشن قبل حفظ التاسك.");
    }

    rest.section_id = sectionId;
  }

  const result = id
    ? await supabase
        .from(table)
        .update(rest)
        .eq("id", id)
        .select()
    : await supabase
        .from(table)
        .insert(rest)
        .select();

  if (result.error) {
    console.error("Supabase save error:", result.error);
    throw result.error;
  }

  return result.data;
}

export async function deleteRow(table, id) {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ---------- File upload ----------

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
    throw new Error(error.message || "خطأ أثناء رفع الملف");
  }

  const { data: publicData } = supabase.storage
    .from("files")
    .getPublicUrl(data.path);

  if (!publicData?.publicUrl) {
    throw new Error("تم رفع الملف لكن تعذّر إنشاء رابط له.");
  }

  return publicData.publicUrl;
}

// ---------- Subjects with sections ----------

export async function getSubjectsWithSections() {
  if (!supabase) {
    return [];
  }

  const [subjects, sections] = await Promise.all([
    q("subjects", (query) => query.order("id")),
    q("sections", (query) => query.order("id")),
  ]);

  const subjectIds = new Set(
    sections.map((section) => Number(section.subject_id))
  );

  return subjects.filter((subject) =>
    subjectIds.has(Number(subject.id))
  );
}

// ---------- Online Exams ----------

export async function getPublishedExams() {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  await ensureAnonymousSession();

  const { data, error } = await supabase
    .from("exams")
    .select(`
      id,
      title,
      description,
      subject_id,
      audience,
      section_id,
      duration_minutes,
      pass_mark,
      sort_order
    `)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Load exams error:", error);
    throw error;
  }

  return data ?? [];
}

// ---------- Load one published exam and its questions ----------

export async function getExamForAttempt(examId) {
  if (!supabase) {
    throw new Error("Supabase غير مهيأ. راجع ملف .env");
  }

  await ensureAnonymousSession();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select(`
      id,
      title,
      description,
      duration_minutes,
      pass_mark,
      subject_id,
      audience,
      section_id
    `)
    .eq("id", examId)
    .eq("is_published", true)
    .maybeSingle();

  if (examError) {
    console.error("Load exam error:", examError);
    throw examError;
  }

  if (!exam) {
    throw new Error("الامتحان غير موجود أو لم يتم نشره.");
  }

  const { data: questions, error: questionsError } =
    await supabase
      .from("exam_questions")
      .select(`
        id,
        prompt,
        question_type,
        options,
        points,
        sort_order
      `)
      .eq("exam_id", examId)
      .order("sort_order", { ascending: true });

  if (questionsError) {
    console.error("Load exam questions error:", questionsError);
    throw questionsError;
  }

  return {
    exam,
    questions: questions ?? [],
  };
}
