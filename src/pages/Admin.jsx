
import { useEffect, useState } from "react";
import { useAuth } from "../context/Auth.jsx";
import {
  listAll,
  saveRow,
  deleteRow,
  uploadFile,
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
  "الجمعة",
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
      `${r.day_of_week} ${String(r.start_time ?? "").slice(0, 5)}`,
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
};

const toLocal = (value) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function Admin() {
  const { session, isAdmin, ready, logout, enabled } = useAuth();

  const [tab, setTab] = useState("subjects");
  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const res = RES[tab];

  const load = async () => {
    try {
      setMsg("");

      const [currentRows, subjectRows] = await Promise.all([
        listAll(tab),
        listAll("subjects"),
      ]);

      setRows(currentRows ?? []);
      setSubjects(subjectRows ?? []);

      if (tab === "section_tasks") {
        const sectionRows = await listAll("sections");
        setSections(sectionRows ?? []);
      } else if (tab === "sections") {
        setSections(currentRows ?? []);
      }
    } catch (error) {
      setMsg("تعذّر تحميل البيانات: " + error.message);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      setForm({});
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

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
        <button className="btn g" onClick={logout}>
          خروج
        </button>
      </>
    );
  }

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const edit = (row) => {
    const next = { ...row };

    for (const key of ["due_date", "deadline"]) {
      if (next[key]) next[key] = toLocal(next[key]);
    }

    for (const key of ["start_time", "end_time"]) {
      if (next[key]) next[key] = String(next[key]).slice(0, 5);
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
      setMsg("فشل رفع الملف: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setMsg("");

    try {
      const row = { ...form };

      // تحقق خاص بتاسكات السكاشن
      if (tab === "section_tasks") {
        const selectedSection = Number(row.section_id);

        if (
          row.section_id == null ||
          row.section_id === "" ||
          !Number.isFinite(selectedSection) ||
          selectedSection <= 0
        ) {
          setMsg("من فضلك اختار السكشن قبل حفظ التاسك.");
          return;
        }

        const exists = sections.some(
          (section) => Number(section.id) === selectedSection
        );

        if (!exists) {
          setMsg("السكشن المختار غير موجود. حدّث الصفحة واختار سكشن موجود.");
          return;
        }

        row.section_id = selectedSection;
      }

      for (const [key, , type] of res.fields) {
        if (["number", "subject", "section", "sectionDay"].includes(type)) {
          row[key] =
            row[key] === "" || row[key] == null
              ? null
              : Number(row[key]);
        } else if (type === "datetime") {
          row[key] = row[key]
            ? new Date(row[key]).toISOString()
            : null;
        } else if (row[key] === "") {
          row[key] = null;
        }
      }

      // لا نسمح بإرسال section_id فارغ
      if (
        tab === "section_tasks" &&
        (!Number.isFinite(row.section_id) || row.section_id <= 0)
      ) {
        setMsg("رقم السكشن غير صحيح. اختار السكشن مرة أخرى.");
        return;
      }

      await saveRow(tab, row);

      setForm({});
      setMsg("تم الحفظ بنجاح ✅");
      await load();
    } catch (error) {
      setMsg("فشل الحفظ: " + error.message);
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
      setMsg("فشل الحذف: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>لوحة الأدمن</h1>

      <div className="bar">
        {Object.entries(RES).map(([key, value]) => (
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
            {value.label}
          </button>
        ))}

        <button type="button" className="btn g" onClick={logout}>
          خروج
        </button>
      </div>

      <form className="card" onSubmit={submit}>
        <b>
          {form.id ? "تعديل" : "إضافة"} — {res.label}
        </b>

        <div className="bar" style={{ marginTop: 12 }}>
          {res.fields.map(([key, label, type]) => (
            <label
              key={key}
              className="mut"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {label}

              {type === "subject" ? (
                <select
                  required
                  value={form[key] ?? ""}
                  onChange={(event) => set(key, event.target.value)}
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              ) : type === "section" ? (
                <select
                  required
                  value={form[key] ?? ""}
                  disabled={sections.length === 0}
                  onChange={(event) => set(key, event.target.value)}
                >
                  <option value="">
                    {sections.length
                      ? "اختر السكشن"
                      : "لا توجد سكاشن متاحة"}
                  </option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              ) : type === "day" ? (
                <select
                  required
                  value={form[key] ?? ""}
                  onChange={(event) => set(key, event.target.value)}
                >
                  <option value="">اختر اليوم</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : type === "sectionDay" ? (
                <select
                  required
                  value={form[key] ?? ""}
                  onChange={(event) => set(key, event.target.value)}
                >
                  <option value="">اختر اليوم</option>
                  {SECTION_DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : type === "file" ? (
                <>
                  <input
                    type="file"
                    onChange={(event) =>
                      onFile(key, event.target.files?.[0])
                    }
                  />
                  <input
                    type="url"
                    placeholder="أو الصق رابط الملف"
                    value={form[key] ?? ""}
                    onChange={(event) => set(key, event.target.value)}
                  />
                </>
              ) : (
                <input
                  required={
                    ["name", "title"].includes(key) ||
                    ["datetime", "time"].includes(type)
                  }
                  type={type === "datetime" ? "datetime-local" : type}
                  value={form[key] ?? ""}
                  onChange={(event) => set(key, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        <button className="btn" disabled={busy}>
          {busy ? "جاري التنفيذ..." : "حفظ"}
        </button>{" "}

        {form.id && (
          <button
            type="button"
            className="btn g"
            onClick={() => {
              setForm({});
              setMsg("");
            }}
          >
            إلغاء التعديل
          </button>
        )}

        {msg && <p className="mut">{msg}</p>}
      </form>

      <h2>
        {res.label} الحالية ({rows.length})
      </h2>

      <div className="card">
        {rows.length ? (
          rows.map((row) => (
            <div className="row" key={row.id}>
              <b>{res.title(row) || `#${row.id}`}</b>

              <span>
                <button
                  type="button"
                  className="btn g"
                  disabled={busy}
                  onClick={() => edit(row)}
                >
                  تعديل
                </button>{" "}

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
          ))
        ) : (
          <p className="mut">لا يوجد محتوى بعد.</p>
        )}
      </div>
    </>
  );
}
