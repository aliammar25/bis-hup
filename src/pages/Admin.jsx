import { useEffect, useState } from "react";
import { useAuth } from "../context/Auth.jsx";
import { listAll, saveRow, deleteRow, uploadFile } from "../services/api.js";
import Login from "./Login.jsx";

const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
// [name, label, type]
const RES = {
  subjects: { label: "المواد", title: (r) => r.name, fields: [["name", "الاسم", "text"], ["code", "الكود", "text"], ["doctor_name", "الدكتور", "text"]] },
  lectures: { label: "المحاضرات", title: (r) => r.title, fields: [["subject_id", "المادة", "subject"], ["title", "العنوان", "text"], ["week_number", "الأسبوع", "number"], ["file_url", "الملف", "file"]] },
  tasks: { label: "التاسكات", title: (r) => r.title, fields: [["subject_id", "المادة", "subject"], ["title", "العنوان", "text"], ["description", "الوصف", "text"], ["due_date", "آخر موعد", "datetime"], ["file_url", "ملف التكليف", "file"]] },
  timetable: { label: "الجدول", title: (r) => `${r.day_of_week} ${String(r.start_time).slice(0, 5)}`, fields: [["subject_id", "المادة", "subject"], ["day_of_week", "اليوم", "day"], ["start_time", "من", "time"], ["end_time", "إلى", "time"], ["location", "المكان", "text"]] },
};
const toLocal = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function Admin() {
  const { session, isAdmin, ready, logout, enabled } = useAuth();
  const [tab, setTab] = useState("subjects");

  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const res = RES[tab];

  const load = async () => {
    try { setRows(await listAll(tab)); setSubjects(await listAll("subjects")); }
    catch (e) { setMsg("تعذّر تحميل البيانات: " + e.message); }
  };
  useEffect(() => { if (isAdmin) { setForm({}); setMsg(""); load(); } /* eslint-disable-next-line */ }, [tab, isAdmin]);

  if (!enabled) return (<><h1>لوحة الأدمن</h1><p className="mut">ضيف VITE_SUPABASE_URL في ملف .env ثم أعد تشغيل المشروع.</p></>);
  if (!ready) return <p className="mut">جاري التحميل...</p>;
  if (!session) return <Login />;
  if (!isAdmin) return (<><h1>لوحة الأدمن</h1><p className="mut">هذا الحساب ليس أدمن. نفّذ سطر الترقية في SQL Editor ثم أعد تسجيل الدخول.</p><button className="btn g" onClick={logout}>خروج</button></>);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const edit = (r) => {
    const f = { ...r };
    if (f.due_date) f.due_date = toLocal(f.due_date);
    for (const k of ["start_time", "end_time"]) if (f[k]) f[k] = String(f[k]).slice(0, 5);
    setForm(f); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onFile = async (k, file) => {
    if (!file) return;
    setBusy(true); setMsg("جاري رفع الملف...");
    try { set(k, await uploadFile(file)); setMsg("تم رفع الملف."); } 
    
    
    
catch (e) {
  console.error("File upload failed:", e);
  setMsg(
    "فشل الرفع: " +
    (e?.message || e?.error || JSON.stringify(e) || "خطأ غير معروف")
  );
} finally {
  setBusy(false);
}

  };
  const submit = async (e) => {
    e.preventDefault();
    const row = { ...form };
    for (const [k, , t] of res.fields) {
      if (t === "number" || t === "subject") row[k] = row[k] === "" || row[k] == null ? null : Number(row[k]);
      else if (t === "datetime" && row[k]) row[k] = new Date(row[k]).toISOString();
      else if (row[k] === "") row[k] = null;
    }
    setBusy(true);
    try { await saveRow(tab, row); setForm({}); setMsg("تم الحفظ ✅"); await load(); }
    catch (e2) { setMsg("فشل الحفظ: " + e2.message); }
    setBusy(false);
  };
  const del = async (id) => {
    if (!confirm("متأكد من الحذف؟ (حذف المادة يحذف محاضراتها وتاسكاتها)")) return;
    try { await deleteRow(tab, id); await load(); } catch (e) { setMsg("فشل الحذف: " + e.message); }
  };

  return (
    <>
      <h1>لوحة الأدمن</h1>
      <div className="bar">
        {Object.entries(RES).map(([k, v]) => <button key={k} className={`btn ${tab === k ? "" : "g"}`} onClick={() => setTab(k)}>{v.label}</button>)}
        <button className="btn g" onClick={logout}>خروج</button>
      </div>

      <form className="card" onSubmit={submit}>
        <b>{form.id ? "تعديل" : "إضافة"} — {res.label}</b>
        <div className="bar" style={{ marginTop: 12 }}>
          {res.fields.map(([k, label, t]) => (
            <label key={k} className="mut" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {label}
              {t === "subject" ? (
                <select required value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)}>
                  <option value="">اختر المادة</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : t === "day" ? (
                <select required value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)}>
                  <option value="">اختر اليوم</option>{DAYS.map((d) => <option key={d}>{d}</option>)}
                </select>
              ) : t === "file" ? (
                <>
                  <input type="file" onChange={(e) => onFile(k, e.target.files[0])} />
                  <input type="url" placeholder="أو الصق رابط" value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
                </>
              ) : (
                <input required={["name", "title"].includes(k) || ["datetime", "time"].includes(t)}
                  type={t === "datetime" ? "datetime-local" : t} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
              )}
            </label>
          ))}
        </div>
        <button className="btn" disabled={busy}>حفظ</button>{" "}
        {form.id && <button type="button" className="btn g" onClick={() => setForm({})}>إلغاء التعديل</button>}
        {msg && <p className="mut">{msg}</p>}
      </form>

      <h2>{res.label} الحالية ({rows.length})</h2>
      <div className="card">
        {rows.length ? rows.map((r) => (
          <div className="row" key={r.id}>
            <b>{res.title(r)}</b>
            <span><button className="btn g" onClick={() => edit(r)}>تعديل</button> <button className="btn g" style={{ color: "var(--bad)" }} onClick={() => del(r.id)}>حذف</button></span>
          </div>
        )) : <p className="mut">لا يوجد محتوى بعد.</p>}
      </div>
    </>
  );
}
