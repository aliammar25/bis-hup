// import { taskStatus, fmtDate } from "../hooks/taskStatus.js";

// export default function TaskRow({ task, subject, showDesc }) {
//   const s = taskStatus(task.due_date);
//   return (
//     <div className="row">
//       <div>
//         <b>{task.title}</b>
//         {showDesc && <div className="mut">{task.description}</div>}
//         <div className="mut">{subject?.name} · آخر موعد {fmtDate(task.due_date)}</div>
//       </div>
//       <span className={`badge ${s.cls}`}>{s.label}</span>
//     </div>
//   );
// }



import { taskStatus, fmtDate } from "../hooks/taskStatus.js";

export default function TaskRow({ task, subject, showDesc }) {
  const s = taskStatus(task.due_date);

  const taskLink =
    task.link ||
    task.task_url ||
    task.url ||
    task.google_drive_url ||
    task.file_url ||
    "";

  return (
    <div className="row">
      <div>
        <b>{task.title}</b>

        {showDesc && task.description && (
          <div className="mut">{task.description}</div>
        )}

        <div className="mut">
          {subject?.name} · آخر موعد {fmtDate(task.due_date)}
        </div>

        {taskLink && (
          <div style={{ marginTop: "10px" }}>
            <a
              href={taskLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                color: "#2563eb",
                textDecoration: "underline",
                fontWeight: "bold",
              }}
            >
              🔗 فتح رابط التاسك
            </a>
          </div>
        )}
      </div>

      <span className={`badge ${s.cls}`}>
        {s.label}
      </span>
    </div>
  );
}

