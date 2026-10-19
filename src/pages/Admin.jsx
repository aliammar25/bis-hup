
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/Auth.jsx";
import {
  listAll,
  saveRow,
  deleteRow,
  uploadFile,
  getExamAnswerKey,
  saveExamAnswerKey,
  getExamAttempts,
} from "../services/api.js";
import Login from "./Login.jsx";

const DAYS = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
];

const SECTION_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "السبت",
];

const RES = {
  subjects: {
    label: "المواد",
    title: (r) => r.name,
    fields: [
      ["name", "الاسم", "text"],
      ["code", "الكود", "text"],
      ["doctor_name", "الدكتور", "text"],
    ],
  },
  lectures: {
    label: "المحاضرات",
    title: (r) => r.title,
    fields: [
      ["subject_id", "المادة", "subject"],
      ["title", "العنوان", "text"],
      ["week_number", "الأسبوع", "number"],
      ["file_url", "الملف", "file"],
    ],
  },
  tasks: {
    label: "التاسكات",
    title: (r) => r.title,
    fields: [
      ["subject_id", "المادة", "subject"],
      ["title", "العنوان", "text"],
      ["description", "الوصف", "text"],
      ["due_date", "آخر موعد", "datetime"],
      ["file_url", "ملف التكليف", "file"],
    ],
  },
  timetable: {
    label: "الجدول",
    title: (r) =>
      `${DAYS[Number(r.day_of_week)] ?? r.day_of_week} ${String(
        r.start_time ?? ""
      ).slice(0, 5)}`,
    fields: [
      ["subject_id", "المادة", "subject"],
      ["day_of_week", "اليوم", "day"],
      ["start_time", "من", "time"],
      ["end_time", "إلى", "time"],
      ["location", "المكان", "text"],
    ],
  },
  sections: {
    label: "السكاشن",
    title: (r) => r.name,
    fields: [
      ["subject_id", "المادة", "subject"],
      ["name", "اسم السكشن", "text"],
      ["instructor_name", "اسم المعيد", "text"],
      ["day_of_week", "اليوم", "sectionDay"],
      ["start_time", "وقت البداية", "time"],
      ["end_time", "وقت النهاية", "time"],
      ["place", "المكان", "text"],
    ],
  },
  section_tasks: {
    label: "تاسكات السكاشن",
    title: (r) => r.title,
    fields: [
      ["section_id", "السكشن", "section"],
      ["title", "عنوان التاسك", "text"],
      ["description", "الوصف", "text"],
      ["deadline", "موعد التسليم", "datetime"],
      ["file_url", "ملف التاسك", "file"],
    ],
  },

  // إدارة الامتحانات
  exams: {
    label: "الامتحانات",
    title: (r) => r.title,
    fields: [
      ["title", "اسم الامتحان", "text"],
      ["description", "الوصف", "text"],
      ["subject_id", "المادة", "subjectOptional"],
      ["audience", "الفئة المستهدفة", "audience"],
      ["section_id", "السكشن (اختياري)", "sectionOptional"],
      ["duration_minutes", "المدة بالدقائق", "number"],
      ["pass_mark", "درجة النجاح", "number"],
      ["sort_order", "ترتيب الامتحان", "number"],
      ["is_published", "نشر الامتحان", "checkbox"],
    ],
  },

  exam_questions: {
    label: "أسئلة الامتحانات",
    title: (r) => r.prompt,
    fields: [
      ["exam_id", "الامتحان", "exam"],
      ["prompt", "نص السؤال", "text"],
      ["question_type", "نوع السؤال", "questionType"],
      ["options", "الاختيارات بصيغة JSON", "json"],
      ["points", "درجة السؤال", "number"],
      ["sort_order", "ترتيب السؤال", "number"],
      ["correct_answer", "الإجابة الصحيحة بصيغة JSON", "json"],
    ],
  },
};

const toLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const toIso = (value, label) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`قيمة ${label} غير صحيحة.`);
  }
  return date.toISOString();
};

const normalizeTime = (value) => {
  if (value == null || String(value).trim() === "") return null;

  const time = String(value).trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
    throw new Error("صيغة الوقت غير صحيحة.");
  }

  return time.length === 5 ? `${time}:00` : time;
};

const timeToSeconds = (value) => {
  const [hours, minutes, seconds = "0"] = value.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const jsonText = (value, fallback = "[]") => {
  if (value == null || value === "") return fallback;
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
};

export default function Admin() {
  const { session, isAdmin, ready, logout, enabled } = useAuth();

  const [tab, setTab] = useState("subjects");
  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const res = RES[tab];
  const isResultsTab = tab === "exam_results";

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const load = useCallback(async () => {
    try {
      setMsg("");

      const [subjectRows, examRows, sectionRows] = await Promise.all([
        listAll("subjects"),
        listAll("exams"),
        listAll("sections"),
      ]);

      setSubjects(subjectRows ?? []);
      setExams(examRows ?? []);
      setSections(sectionRows ?? []);

      if (tab === "exam_results") {
        setRows(await getExamAttempts());
      } else {
        const currentRows = await listAll(tab);
        setRows(currentRows ?? []);
      }

      if (tab === "exam_questions") {
        // عرض الإجابة الصحيحة داخل نموذج التعديل فقط.
        // لا تُضاف الإجابة الصحيحة إلى بيانات الأسئلة العامة.
        setForm((current) => current);
      }
    } catch (error) {
      setMsg(
        "تعذّر تحميل البيانات: " +
          (error?.message ?? "خطأ غير معروف")
      );
    }
  }, [tab]);

  useEffect(() => {
    if (isAdmin) {
      setForm({});
      load();
    }
  }, [tab, isAdmin, load]);

  if (!enabled) {
    return (
      <>
        <h1>لوحة الأدمن</h1>
        <p className="mut">
          راجع إعداد VITE_SUPABASE_URL ثم أعد تشغيل المشروع.
        </p>
      </>
    );
  }

  if (!ready) return <p className="mut">جاري التحميل...</p>;
  if (!session) return <Login />;

  if (!isAdmin) {
    return (
      <>
        <h1>لوحة الأدمن</h1>
        <p className="mut">هذا الحساب ليس أدمن.</p>
        <button className="btn g" onClick={logout}>خروج</button>
      </>
    );
  }

  const edit = async (row) => {
    const next = { ...row };

    for (const key of ["due_date", "deadline"]) {
      if (next[key]) next[key] = toLocal(next[key]);
    }

    for (const key of ["start_time", "end_time"]) {
      if (next[key]) next[key] = String(next[key]).slice(0, 5);
    }

    for (const key of ["subject_id", "section_id", "exam_id"]) {
      if (next[key] != null) next[key] = String(next[key]);
    }

    for (const key of ["week_number", "day_of_week", "duration_minutes", "pass_mark", "points", "sort_order"]) {
      if (next[key] != null) next[key] = String(next[key]);
    }

    if (tab === "exam_questions") {
      next.options = jsonText(next.options);

      try {
        const key = await getExamAnswerKey(row.id);
        next.correct_answer = key
          ? jsonText(key.correct_answer, '""')
          : '""';
      } catch (error) {
        setMsg("تعذّر تحميل الإجابة الصحيحة: " + error.message);
        return;
      }
    }

    setForm(next);
    setMsg("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onFile = async (key, file) => {
    if (!file) return;

    setBusy(true);
    setMsg("جاري رفع الملف...");

    try {
      const url = await uploadFile(file);
      set(key, url);
      setMsg("تم رفع الملف.");
    } catch (error) {
      setMsg("فشل رفع الملف: " + (error?.message ?? "خطأ غير معروف"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || isResultsTab) return;

    setBusy(true);
    setMsg("");

    try {
      const row = { ...form };
      const answerText = row.correct_answer;
      delete row.correct_answer;

      if (tab === "section_tasks") {
        const selectedSection = String(row.section_id ?? "").trim();

        if (!selectedSection) {
          throw new Error("اختار السكشن قبل حفظ التاسك.");
        }

        if (!sections.some((section) => String(section.id) === selectedSection)) {
          throw new Error("السكشن المختار غير موجود. حدّث الصفحة واختاره مرة أخرى.");
        }

        row.section_id = selectedSection;
      }

      for (const [key, label, type] of res.fields) {
        if (key === "correct_answer") continue;

        const value = row[key];

        if (type === "subject" || type === "subjectOptional" || type === "section" || type === "sectionOptional" || type === "exam") {
          row[key] = value == null || String(value).trim() === ""
            ? null
            : String(value).trim();
        } else if (type === "number") {
          if (value == null || value === "") {
            row[key] = null;
          } else {
            const number = Number(value);
            if (!Number.isFinite(number)) {
              throw new Error(`${label} يجب أن يكون رقمًا.`);
            }
            row[key] = number;
          }
        } else if (type === "checkbox") {
          row[key] = value === true || value === "true";
        } else if (type === "day" || type === "sectionDay") {
          if (value == null || value === "") {
            row[key] = null;
          } else {
            const day = Number(value);
            const maxDay = type === "day" ? 5 : 6;

            if (!Number.isInteger(day) || day < 0 || day > maxDay) {
              throw new Error(`اختيار ${label} غير صحيح.`);
            }
            row[key] = day;
          }
        } else if (type === "datetime") {
          row[key] = toIso(value, label);
        } else if (type === "time") {
          row[key] = normalizeTime(value);
        } else if (type === "json") {
          try {
            row[key] = JSON.parse(value || "[]");
          } catch {
            throw new Error(`${label}: اكتب JSON صحيحًا.`);
          }
        } else if (typeof value === "string" && value.trim() === "") {
          row[key] = null;
        }
      }

      if (tab === "exams") {
        if (!row.title?.trim()) throw new Error("اكتب اسم الامتحان.");
        if (!Number.isFinite(row.duration_minutes) || row.duration_minutes < 1) {
          throw new Error("مدة الامتحان يجب أن تكون دقيقة واحدة على الأقل.");
        }
        if (!Number.isFinite(row.pass_mark) || row.pass_mark < 0) {
          throw new Error("درجة النجاح يجب أن تكون صفرًا أو أكثر.");
        }
        if (!row.audience) row.audience = "all";
        if (row.audience !== "section") row.section_id = null;
        if (row.audience === "section" && !row.section_id) {
          throw new Error("اختار السكشن المخصص له الامتحان.");
        }
      }

      if (tab === "exam_questions") {
        if (!row.exam_id) throw new Error("اختار الامتحان.");
        if (!row.prompt?.trim()) throw new Error("اكتب نص السؤال.");
        if (!row.question_type) throw new Error("اختار نوع السؤال.");
        if (!Number.isFinite(row.points) || row.points <= 0) {
          throw new Error("درجة السؤال يجب أن تكون أكبر من صفر.");
        }

        // حذف المعرفات الزمنية التي تنشئها قاعدة البيانات.
        delete row.created_at;
      }

      if (tab === "sections" || tab === "timetable") {
        const start = row.start_time;
        const end = row.end_time;

        if (tab === "timetable" && (!start || !end)) {
          throw new Error("أدخل وقت البداية ووقت النهاية.");
        }

        if (start && end && timeToSeconds(end) <= timeToSeconds(start)) {
          throw new Error("وقت النهاية يجب أن يكون بعد وقت البداية.");
        }
      }

      const savedRows = await saveRow(tab, row);
      const saved = Array.isArray(savedRows) ? savedRows[0] : savedRows;

      if (tab === "exam_questions") {
        const questionId = saved?.id ?? row.id;

        if (!questionId) {
          throw new Error("تم حفظ السؤال لكن لم يرجع معرّفه. راجع صلاحيات الإرجاع في Supabase.");
        }

        if (answerText != null && String(answerText).trim() !== "") {
          let parsedAnswer;

          try {
            parsedAnswer = JSON.parse(answerText);
          } catch {
            throw new Error("الإجابة الصحيحة يجب أن تكون JSON صالحًا، مثل \"A\" أو 1.");
          }

          await saveExamAnswerKey(questionId, parsedAnswer);
        }
      }

      setForm({});
      setMsg("تم الحفظ بنجاح ✅");
      await load();
    } catch (error) {
      setMsg("فشل الحفظ: " + (error?.message ?? "خطأ غير معروف"));
      console.error("Admin save error:", error);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟")) return;

    setBusy(true);
    setMsg("");

    try {
      await deleteRow(tab, id);
      setMsg("تم الحذف بنجاح.");
      await load();
    } catch (error) {
      setMsg("فشل الحذف: " + (error?.message ?? "خطأ غير معروف"));
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    ...Object.entries(RES).map(([key, value]) => ({
      key,
      label: value.label,
    })),
    { key: "exam_results", label: "نتائج الامتحانات" },
  ];

  const renderField = ([key, label, type]) => {
    const value = form[key] ?? "";

    const common = {
      name: key,
      value,
      onChange: (event) => set(key, event.target.value),
    };

    if (type === "checkbox") {
      return (
        <input
          name={key}
          type="checkbox"
          checked={value === true || value === "true"}
          onChange={(event) => set(key, event.target.checked)}
        />
      );
    }

    if (type === "subject" || type === "subjectOptional") {
      return (
        <select
          {...common}
          required={type === "subject"}
        >
          <option value="">
            {type === "subject" ? "اختر المادة" : "بدون مادة"}
          </option>
          {subjects.map((subject) => (
            <option key={subject.id} value={String(subject.id)}>
              {subject.name}
            </option>
          ))}
        </select>
      );
    }

    if (type === "section" || type === "sectionOptional") {
      return (
        <select {...common} required={type === "section"}>
          <option value="">
            {type === "section" ? "اختر السكشن" : "بدون سكشن"}
          </option>
          {sections.map((section) => (
            <option key={section.id} value={String(section.id)}>
              {section.name}
            </option>
          ))}
        </select>
      );
    }

    if (type === "exam") {
      return (
        <select {...common} required>
          <option value="">اختر الامتحان</option>
          {exams.map((exam) => (
            <option key={exam.id} value={String(exam.id)}>
              {exam.title}
            </option>
          ))}
        </select>
      );
    }

    if (type === "audience") {
      return (
        <select {...common} required>
          <option value="all">كل الطلاب</option>
          <option value="section">سكشن محدد</option>
        </select>
      );
    }

    if (type === "questionType") {
      return (
        <select {...common} required>
          <option value="">اختر نوع السؤال</option>
          <option value="mcq">اختيار من متعدد (mcq)</option>
          <option value="true_false">صح أو خطأ (true_false)</option>
          <option value="short_answer">إجابة قصيرة (short_answer)</option>
        </select>
      );
    }

    if (type === "day" || type === "sectionDay") {
      const days = type === "day" ? DAYS : SECTION_DAYS;

      return (
        <select {...common} required>
          <option value="">اختر اليوم</option>
          {days.map((day, index) => (
            <option key={day} value={index}>{day}</option>
          ))}
        </select>
      );
    }

    if (type === "file") {
      return (
        <>
          <input
            type="file"
            disabled={busy}
            onChange={(event) => onFile(key, event.target.files?.[0])}
          />
          <input
            {...common}
            type="url"
            placeholder="أو الصق رابط الملف"
          />
        </>
      );
    }

    if (type === "json") {
      return (
        <textarea
          {...common}
          rows={4}
          placeholder={
            key === "options"
              ? '[{"label":"A","text":"الإجابة الأولى"},{"label":"B","text":"الإجابة الثانية"}]'
              : '"A"'
          }
        />
      );
    }

    return (
      <input
        {...common}
        required={
          ["name", "title", "prompt", "question_type"].includes(key) ||
          (type === "datetime" && tab === "tasks")
        }
        type={
          type === "datetime"
            ? "datetime-local"
            : type === "number"
              ? "number"
              : type
        }
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
      />
    );
  };

  return (
    <>
      <h1>لوحة الأدمن</h1>

      <div className="bar">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`btn ${tab === key ? "" : "g"}`}
            onClick={() => {
              setTab(key);
              setForm({});
              setMsg("");
            }}
          >
            {label}
          </button>
        ))}

        <button type="button" className="btn g" onClick={logout}>
          خروج
        </button>
      </div>

      {msg && <p className="mut">{msg}</p>}

      {isResultsTab ? (
        <>
          <h2>نتائج ومحاولات الامتحانات ({rows.length})</h2>
          <div className="card">
            {rows.length ? rows.map((attempt) => {
              const exam = exams.find(
                (item) => String(item.id) === String(attempt.exam_id)
              );

              return (
                <div className="row" key={attempt.id}>
                  <div>
                    <b>{exam?.title ?? `امتحان #${attempt.exam_id}`}</b>
                    <p className="mut">
                      الطالب: {attempt.student_id}
                    </p>
                    <p className="mut">
                      الدرجة: {attempt.score ?? "لم تُصحح"} / {attempt.max_score ?? "—"}
                    </p>
                    <p className="mut">
                      الصحيحة: {attempt.correct_count} — الخطأ: {attempt.wrong_count}
                    </p>
                    <p className="mut">
                      بدأ: {attempt.started_at
                        ? new Date(attempt.started_at).toLocaleString("ar-EG")
                        : "—"}
                    </p>
                    <p className="mut">
                      سلّم: {attempt.submitted_at
                        ? new Date(attempt.submitted_at).toLocaleString("ar-EG")
                        : "لم يسلّم"}
                    </p>
                  </div>
                </div>
              );
            }) : <p className="mut">لا توجد محاولات حتى الآن.</p>}
          </div>
        </>
      ) : (
        <>
          <form className="card" onSubmit={submit}>
            <b>{form.id ? "تعديل" : "إضافة"} — {res.label}</b>

            <div className="bar" style={{ marginTop: 12 }}>
              {res.fields.map(([key, label, type]) => (
                <label
                  key={key}
                  className="mut"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minWidth: 180,
                  }}
                >
                  {label}
                  {renderField([key, label, type])}
                </label>
              ))}
            </div>

            <button className="btn" type="submit" disabled={busy}>
              {busy ? "جاري التنفيذ..." : "حفظ"}
            </button>{" "}

            {form.id && (
              <button
                type="button"
                className="btn g"
                disabled={busy}
                onClick={() => {
                  setForm({});
                  setMsg("");
                }}
              >
                إلغاء التعديل
              </button>
            )}
          </form>

          <h2>{res.label} الحالية ({rows.length})</h2>
          <div className="card">
            {rows.length ? rows.map((row) => (
              <div className="row" key={row.id}>
                <b>{res.title(row) || `#${row.id}`}</b>
                <span>
                  {tab === "exam_questions" && (
                    <button
                      type="button"
                      className="btn g"
                      disabled={busy}
                      onClick={() => edit(row)}
                    >
                      تعديل السؤال والإجابة
                    </button>
                  )}{" "}
                  {tab !== "exam_questions" && (
                    <button
                      type="button"
                      className="btn g"
                      disabled={busy}
                      onClick={() => edit(row)}
                    >
                      تعديل
                    </button>
                  )}{" "}
                  <button
                    type="button"
                    className="btn g"
                    style={{ color: "var(--bad)" }}
                    disabled={busy}
                    onClick={() => del(row.id)}
                  >
                    حذف
                  </button>
                </span>
              </div>
            )) : <p className="mut">لا يوجد محتوى بعد.</p>}
          </div>
        </>
      )}
    </>
  );
}
