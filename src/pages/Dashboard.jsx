import { getSubjects, getLectures, getTasks } from "../services/api.js";
import useAsync from "../hooks/useAsync.js";
import Status from "../components/Status.jsx";
import TaskRow from "../components/TaskRow.jsx";

export default function Dashboard() {
  const { data, loading, error } = useAsync(() => Promise.all([getSubjects(), getLectures(), getTasks()]));
  const [subjects, lectures, tasks] = data ?? [[], [], []];
  const map = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const upcoming = tasks.filter((t) => new Date(t.due_date) > Date.now()).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 3);

  return (
    <>
      <h1>أهلاً بك في BIS Hub </h1>
      <h2>مع تحياتي  Eng/Ali Ammar</h2>
<a
  href="https://wa.me/201118580453"
  target="_blank"
  rel="noopener noreferrer"
  className="whatsapp-btn"
>
  Contact Me on WhatsApp
</a>
      <Status loading={loading} error={error}>
        <div className="grid">
          {[["مواد", subjects.length], ["محاضرات", lectures.length], ["تاسكات", tasks.length]].map(([l, n]) => (
            <div key={l} className="card stat"><b>{n}</b>{l}</div>
          ))}
        </div>
        <h2>أقرب مواعيد التسليم</h2>
        <div className="card">
          {upcoming.length ? upcoming.map((t) => <TaskRow key={t.id} task={t} subject={map[t.subject_id]} />) : <p className="mut">لا توجد تاسكات مفتوحة.</p>}
        </div>
        <h2>أحدث المحاضرات</h2>
        <div className="card">
          {[...lectures].reverse().slice(0, 4).map((l) => (
            <div className="row" key={l.id}>
              <div><b>{l.title}</b><div className="mut">{map[l.subject_id]?.name} · الأسبوع {l.week_number}</div></div>
              <a className="lnk" href={l.file_url}>فتح</a>
            </div>
          ))}
          
        </div>
      </Status>
    </>
  );
}
