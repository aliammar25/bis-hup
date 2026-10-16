import { useState } from "react";
import { Link } from "react-router-dom";
import { getSubjects } from "../services/api.js";
import useAsync from "../hooks/useAsync.js";
import Status from "../components/Status.jsx";

export default function Subjects() {
  const { data, loading, error } = useAsync(getSubjects);
  console.log("Subjects data:", data);
console.log("Loading:", loading);
console.log("Error:", error);

  const [q, setQ] = useState("");
  const list = (data ?? []).filter((s) => (s.name + s.code).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>المواد</h1>
      <div className="bar"><input placeholder="ابحث عن مادة..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Status loading={loading} error={error}>
        <div className="grid">
          {list.map((s) => (
            <Link key={s.id} to={`/subjects/${s.id}`} className="plain">
              <div className="card"><b>{s.name}</b><div className="mut">{s.code} · {s.doctor_name}</div></div>
            </Link>
          ))}
        </div>
        {!list.length && <p className="mut">لا توجد نتائج.</p>}
      </Status>
    </>
  );
}
