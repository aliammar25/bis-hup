import { getSubjects, getTimetable } from "../services/api.js";
import useAsync from "../hooks/useAsync.js";
import Status from "../components/Status.jsx";

export default function Timetable() {
  const { data, loading, error } = useAsync(() => Promise.all([getSubjects(), getTimetable()]));
  const [subjects, rows] = data ?? [[], []];
  const map = Object.fromEntries(subjects.map((s) => [s.id, s]));
  return (
    <>
      <h1>الجدول الدراسي</h1>
      <Status loading={loading} error={error} empty={!loading && !rows.length}>
        <div className="card tw">
          <table>
            <thead><tr><th>اليوم</th><th>المادة</th><th>الدكتور</th><th>الوقت</th><th>المكان</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.day_of_week}</td><td>{map[r.subject_id]?.name}</td><td>{map[r.subject_id]?.doctor_name}</td>
                  <td>{String(r.start_time).slice(0, 5)} - {String(r.end_time).slice(0, 5)}</td><td>{r.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Status>
    </>
  );
}
