
import { useEffect, useState } from "react";
import { getPublishedExams } from "../services/api.js";

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExams() {
      try {
        setLoading(true);
        setError("");

        const data = await getPublishedExams();

        if (active) {
          setExams(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "تعذر تحميل الامتحانات."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadExams();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p dir="rtl">جاري تحميل الامتحانات...</p>;
  }

  if (error) {
    return (
      <div dir="rtl" role="alert">
        <p>تعذر تحميل الامتحانات: {error}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <main dir="rtl" className="exams-page">
      <h1>الامتحانات الإلكترونية</h1>

      {exams.length === 0 ? (
        <p>لا توجد امتحانات منشورة حاليًا.</p>
      ) : (
        <div className="exams-list">
          {exams.map((exam) => (
            <article
              key={exam.id}
              className="exam-card"
            >
              <h2>{exam.title}</h2>

              {exam.description && (
                <p>{exam.description}</p>
              )}

              <p>
                مدة الامتحان: {exam.duration_minutes} دقيقة
              </p>

              <p>
                درجة النجاح: {exam.pass_mark}%
              </p>

              <button
                type="button"
                onClick={() => {
                  alert(
                    "سيتم ربط بدء المحاولة وعرض الأسئلة في الخطوة التالية."
                  );
                }}
              >
                دخول الامتحان
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
