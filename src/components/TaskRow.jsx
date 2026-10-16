import { taskStatus, fmtDate } from "../hooks/taskStatus.js";

export default function TaskRow({ task, subject, showDesc }) {
  const s = taskStatus(task.due_date);
  return (
    <div className="row">
      <div>
        <b>{task.title}</b>
        {showDesc && <div className="mut">{task.description}</div>}
        <div className="mut">{subject?.name} · آخر موعد {fmtDate(task.due_date)}</div>
      </div>
      <span className={`badge ${s.cls}`}>{s.label}</span>
    </div>
  );
}
