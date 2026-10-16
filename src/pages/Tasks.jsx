import { useState } from "react";
import { getSubjects, getTasks } from "../services/api.js";
import useAsync from "../hooks/useAsync.js";
import { taskStatus } from "../hooks/taskStatus.js";
import Status from "../components/Status.jsx";
import TaskRow from "../components/TaskRow.jsx";

export default function Tasks() {
  const { data, loading, error } = useAsync(() => Promise.all([getSubjects(), getTasks()]));
  const [sid, setSid] = useState("");
  const [state, setState] = useState("");
  const [subjects, tasks] = data ?? [[], []];
  const map = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const list = tasks
    .filter((t) => (!sid || t.subject_id === Number(sid)) && (!state || taskStatus(t.due_date).cls === state))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  return (
    <>
      <h1>التاسكات الأسبوعية</h1>
      <div className="bar">
        <select value={sid} onChange={(e) => setSid(e.target.value)}>
          <option value="">كل المواد</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="open">مفتوح</option>
          <option value="soon">موعده قريب</option>
          <option value="over">انتهى</option>
        </select>
      </div>
      <Status loading={loading} error={error}>
        <div className="card">
          {list.length ? list.map((t) => <TaskRow key={t.id} task={t} subject={map[t.subject_id]} showDesc />) : <p className="mut">لا توجد نتائج.</p>}
        </div>
      </Status>
    </>
  );
}
