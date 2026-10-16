import { Link, useParams } from "react-router-dom";
import { getSubject, getLectures, getTasks } from "../services/api.js";
import useAsync from "../hooks/useAsync.js";
import Status from "../components/Status.jsx";
import TaskRow from "../components/TaskRow.jsx";
import NotFound from "./NotFound.jsx";

export default function SubjectDetails() {
  const { id } = useParams();
  const { data, loading, error } = useAsync(() => Promise.all([getSubject(id), getLectures(id), getTasks(id)]), [id]);
  if (!loading && !error && !data[0]) return <NotFound />;
  const [subject, lectures, tasks] = data ?? [];
  return (
    <>
      <Link className="lnk" to="/subjects">← كل المواد</Link>
      <Status loading={loading} error={error}>
        <h1>{subject?.name}</h1>
        <p className="mut">{subject?.code} · {subject?.doctor_name}</p>
        <h2>المحاضرات</h2>
        <div className="card">
          {lectures?.length ? [...lectures].sort((a, b) => a.week_number - b.week_number).map((l) => (
            <div className="row" key={l.id}>
              <div><b>{l.title}</b><div className="mut">الأسبوع {l.week_number}</div></div>
              <a className="lnk" href={l.file_url}>تحميل</a>
            </div>
          )) : <p className="mut">لا توجد محاضرات بعد.</p>}
        </div>
        <h2>التاسكات</h2>
        <div className="card">
          {tasks?.length ? tasks.map((t) => <TaskRow key={t.id} task={t} subject={subject} showDesc />) : <p className="mut">لا توجد تاسكات.</p>}
        </div>
      </Status>
    </>
  );
}
