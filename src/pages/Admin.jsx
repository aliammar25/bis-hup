
import { useCallback, useEffect, useState } from "react";
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
  if (value == null || String(value).trim() === "") {
    return null;
  }

  const time = String(value).trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
    throw new Error("صيغة الوقت غير صحيحة.");
  }

  return time.length === 5 ? `${time}:00` : time;
};

const timeToSeconds = (value) => {
  const [hours, minutes, seconds = "0"] = value.split(":");

  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds)
  );
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

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const load = useCallback(async () => {
    try {
      setMsg("");

      const [currentRows, subjectRows] = await Promise.all([
        listAll(tab),
        listAll("subjects"),
      ]);

      setRows(currentRows ?? []);
      setSubjects(subjectRows ?? []);

      if (tab === "sections" || tab === "section_tasks") {
        const sectionRows =
          tab === "sections"
            ? currentRows
            : await listAll("sections");

        setSections(sectionRows ?? []);
      } else {
        setSections([]);
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

  if (!ready) {
    return <p className="mut">جاري التحميل...</p>;
  }

  if (!session) {
    return <Login />;
  }

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

  const edit = (row) => {
    const next = { ...row };

    for (const key of ["due_date", "deadline"]) {
      if (next[key]) next[key] = toLocal(next[key]);
    }

    for (const key of ["start_time", "end_time"]) {
      if (next[key]) {
        next[key] = String(next[key]).slice(0, 5);
      }
    }

    // الاحتفاظ بمعرفات UUID كنصوص.
    for (const key of ["subject_id", "section_id"]) {
      if (next[key] != null) {
        next[key] = String(next[key]);
      }
    }

    for (const key of ["week_number", "day_of_week"]) {
      if (next[key] != null) {
        next[key] = String(next[key]);
      }
    }

    setForm(next);
    setMsg("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
      setMsg(
        "فشل رفع الملف: " +
          (error?.message ?? "خطأ غير معروف")
      );
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

      // التحقق من اختيار السكشن قبل حفظ التاسك.
      if (tab === "section_tasks") {
        const selectedSection = String(
          row.section_id ?? ""
        ).trim();

        if (!selectedSection) {
          throw new Error(
            "من فضلك اختار السكشن قبل حفظ التاسك."
          );
        }

        const exists = sections.some(
          (section) =>
            String(section.id) === selectedSection
        );

        if (!exists) {
          throw new Error(
            "السكشن المختار غير موجود. حدّث الصفحة واختاره مرة أخرى."
          );
        }

        row.section_id = selectedSection;
      }

      // معالجة الحقول حسب نوعها.
      for (const [key, label, type] of res.fields) {
        const value = row[key];

        if (type === "subject" || type === "section") {
          row[key] =
            value == null || String(value).trim() === ""
              ? null
              : String(value).trim();
        } else if (type === "number") {
          if (value == null || value === "") {
            row[key] = null;
          } else {
            const number = Number(value);

            if (!Number.isFinite(number)) {
              throw new Error(
                `${label} يجب أن يكون رقمًا صحيحًا.`
              );
            }

            row[key] = number;
          }
        } else if (
          type === "day" ||
          type === "sectionDay"
        ) {
          if (value == null || value === "") {
            row[key] = null;
          } else {
            const day = Number(value);
            const maxDay = type === "day" ? 5 : 6;

            if (
              !Number.isInteger(day) ||
              day < 0 ||
              day > maxDay
            ) {
              throw new Error(
                `اختيار ${label} غير صحيح.`
              );
            }

            row[key] = day;
          }
        } else if (type === "datetime") {
          row[key] = toIso(value, label);
        } else if (type === "time") {
          row[key] = normalizeTime(value);
        } else if (
          typeof value === "string" &&
          value.trim() === ""
        ) {
          row[key] = null;
        }
      }

      // التحقق من الوقت قبل الإرسال إلى Supabase.
      if (tab === "sections" || tab === "timetable") {
        const start = row.start_time;
        const end = row.end_time;

        // الجدول يحتاج إلى وقت بداية ونهاية.
        if (tab === "timetable" && (!start || !end)) {
          throw new Error(
            "من فضلك أدخل وقت البداية ووقت النهاية للجدول."
          );
        }

        // يسمح السكشن بوقت فارغ حسب قيد قاعدة البيانات.
        // إذا وُجد الوقتان، يجب أن تكون النهاية بعد البداية.
        if (start && end) {
          if (timeToSeconds(end) <= timeToSeconds(start)) {
            throw new Error(
              "وقت النهاية يجب أن يكون بعد وقت البداية."
            );
          }
        }
      }

      if (
        tab === "section_tasks" &&
        (typeof row.section_id !== "string" ||
          !row.section_id.trim())
      ) {
        throw new Error("معرّف السكشن غير صالح.");
      }

      // طباعة البيانات الفعلية المرسلة لتسهيل تشخيص الأخطاء.
      if (tab === "sections") {
        console.log("Section payload:", {
          id: row.id,
          subject_id: row.subject_id,
          name: row.name,
          instructor_name: row.instructor_name,
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          place: row.place,
        });
      }

      console.log("Final row sent to saveRow:", row);

      await saveRow(tab, row);

      setForm({});
      setMsg("تم الحفظ بنجاح ✅");

      await load();
    } catch (error) {
      setMsg(
        "فشل الحفظ: " +
          (error?.message ?? "حدث خطأ غير معروف")
      );

      console.error("Admin save error:", error);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟")) {
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      await deleteRow(tab, id);

      setMsg("تم الحذف بنجاح.");
      await load();
    } catch (error) {
      setMsg(
        "فشل الحذف: " +
          (error?.message ?? "خطأ غير معروف")
      );
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

        <button
          type="button"
          className="btn g"
          onClick={logout}
        >
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
                  name={key}
                  required
                  value={form[key] ?? ""}
                  onChange={(event) =>
                    set(key, event.target.value)
                  }
                >
                  <option value="">اختر المادة</option>

                  {subjects.map((subject) => (
                    <option
                      key={subject.id}
                      value={String(subject.id)}
                    >
                      {subject.name}
                    </option>
                  ))}
                </select>
              ) : type === "section" ? (
                <select
                  name={key}
                  required
                  value={form.section_id ?? ""}
                  disabled={sections.length === 0}
                  onChange={(event) => {
                    set("section_id", event.target.value);
                    setMsg("");
                  }}
                >
                  <option value="">
                    {sections.length > 0
                      ? "اختر السكشن"
                      : "لا توجد سكاشن متاحة"}
                  </option>

                  {sections.map((section) => (
                    <option
                      key={section.id}
                      value={String(section.id)}
                    >
                      {section.name}
                    </option>
                  ))}
                </select>
              ) : type === "day" ? (
                <select
                  name={key}
                  required
                  value={form[key] ?? ""}
                  onChange={(event) =>
                    set(key, event.target.value)
                  }
                >
                  <option value="">اختر اليوم</option>

                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : type === "sectionDay" ? (
                <select
                  name={key}
                  required
                  value={form[key] ?? ""}
                  onChange={(event) =>
                    set(key, event.target.value)
                  }
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
                    disabled={busy}
                    onChange={(event) =>
                      onFile(key, event.target.files?.[0])
                    }
                  />

                  <input
                    name={key}
                    type="url"
                    placeholder="أو الصق رابط الملف"
                    value={form[key] ?? ""}
                    onChange={(event) =>
                      set(key, event.target.value)
                    }
                  />
                </>
              ) : (
                <input
                  name={key}
                  required={
                    ["name", "title"].includes(key) ||
                    (type === "datetime" && tab === "tasks")
                  }
                  type={
                    type === "datetime"
                      ? "datetime-local"
                      : type
                  }
                  min={type === "number" ? 1 : undefined}
                  value={form[key] ?? ""}
                  onChange={(event) =>
                    set(key, event.target.value)
                  }
                />
              )}
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
