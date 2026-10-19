
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

const DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function Sections() {
  const { id } = useParams();
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        if (!supabase) {
          throw new Error("اتصال Supabase غير مُعدّ.");
        }

        const { data: sectionData, error: sectionError } =
          await supabase
            .from("sections")
            .select("*")
            .order("name");

        if (sectionError) throw sectionError;

        const allSections = sectionData ?? [];
        const visibleSections = id
          ? allSections.filter(
              (section) => String(section.subject_id) === String(id)
            )
          : allSections;

        if (!active) return;
        setSections(visibleSections);

        const { data: subjectData, error: subjectError } =
          await supabase.from("subjects").select("id, name, code");

        if (subjectError) {
          console.error("خطأ تحميل المواد:", subjectError.message);
        } else if (active) {
          setSubjects(subjectData ?? []);
        }

        if (visibleSections.length > 0) {
          const ids = visibleSections.map((section) => section.id);

          const { data: taskData, error: taskError } =
            await supabase
              .from("section_tasks")
              .select("*")
              .in("section_id", ids)
              .order("deadline", { ascending: true });

          if (taskError) {
            console.error("خطأ تحميل التاسكات:", taskError.message);
            if (active) setTasks([]);
          } else if (active) {
            setTasks(taskData ?? []);
          }
        } else if (active) {
          setTasks([]);
        }
      } catch (err) {
        console.error("خطأ تحميل السكاشن:", err);
        if (active) {
          setError(err.message || "حدث خطأ أثناء تحميل السكاشن.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [id]);

  const subjectMap = Object.fromEntries(
    subjects.map((subject) => [String(subject.id), subject])
  );

  if (loading) {
    return <p className="mut">جاري تحميل السكاشن...</p>;
  }

  if (error) {
    return (
      <section>
        <h1>السكاشن</h1>
        <p>تعذر تحميل البيانات: {error}</p>
      </section>
    );
  }

  return (
    <section>
      {id && (
        <Link to="/subjects" className="lnk">
          ← الرجوع للمواد
        </Link>
      )}

      <h1>{id ? "سكاشن المادة" : "السكاشن والتاسكات"}</h1>

      <div className="grid">
        <div className="card stat">
          <b>{sections.length}</b>
          عدد السكاشن
        </div>
        <div className="card stat">
          <b>{tasks.length}</b>
          عدد التاسكات
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="mut">
          لا توجد سكاشن ظاهرة. تأكد من وجود بيانات في Supabase وصلاحيات القراءة.
        </p>
      ) : (
        <div className="grid">
          {sections.map((section) => {
            const subject = subjectMap[String(section.subject_id)];
            const sectionTasks = tasks.filter(
              (task) => String(task.section_id) === String(section.id)
            );

            return (
              <article className="card" key={section.id}>
                <h2>{section.name}</h2>

                <p>
                  <b>المادة:</b>{" "}
                  {subject
                    ? `${subject.name} (${subject.code ?? ""})`
                    : "غير محددة"}
                </p>

                <p>
                  <b>المعيد:</b> {section.instructor_name || "لم يُحدد"}
                </p>

                <p>
                  <b>اليوم:</b>{" "}
                  {section.day_of_week == null
                    ? "لم يُحدد"
                    : DAYS[Number(section.day_of_week)] ?? "غير معروف"}
                </p>

                <p>
                  <b>الوقت:</b>{" "}
                  {section.start_time?.slice(0, 5) || "--"} -{" "}
                  {section.end_time?.slice(0, 5) || "--"}
                </p>

                <p>
                  <b>المكان:</b> {section.place || "لم يُحدد"}
                </p>

                <hr />
                <h3>تاسكات السكشن ({sectionTasks.length})</h3>

                {sectionTasks.length === 0 ? (
                  <p className="mut">لا توجد تاسكات لهذا السكشن حاليًا.</p>
                ) : (
                  <ul>
                    {sectionTasks.map((task) => (
                      <li key={task.id}>
                        <b>{task.title}</b>
                        {task.description && <p>{task.description}</p>}

                        <p className="mut">
                          موعد التسليم:{" "}
                          {task.deadline
                            ? new Date(task.deadline).toLocaleString("ar-EG")
                            : "لم يُحدد"}
                        </p>

                        {task.file_url && (
                          <a
                            className="lnk"
                            href={task.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            فتح ملف التاسك
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
