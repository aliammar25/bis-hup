
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExamForAttempt } from "../services/api.js";

export default function ExamAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExam() {
      try {
        setLoading(true);
        setError("");

        const result = await getExamForAttempt(id);

        if (!active) return;

        setExam(result.exam);
        setQuestions(result.questions);
      } catch (err) {
        if (active) {
          setError(err.message || "تعذر تحميل الامتحان.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadExam();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p dir="rtl">جاري تحميل أسئلة الامتحان...</p>;
  }

  if (error) {
    return (
      <main dir="rtl" role="alert">
        <h2>تعذر فتح الامتحان</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/exams")}>
          العودة إلى الامتحانات
        </button>
      </main>
    );
  }

  const getOptions = (options) => {
    if (Array.isArray(options)) return options;

    if (options && typeof options === "object") {
      return Object.entries(options).map(([key, value]) => ({
        label: key,
        value,
      }));
    }

    return [];
  };

  return (
    <main dir="rtl" className="exam-attempt-page">
      <h1>{exam.title}</h1>

      {exam.description && <p>{exam.description}</p>}

      <p>مدة الامتحان: {exam.duration_minutes} دقيقة</p>
      <p>درجة النجاح: {exam.pass_mark}%</p>
      <p>عدد الأسئلة: {questions.length}</p>

      {questions.length === 0 ? (
        <p>لا توجد أسئلة مضافة لهذا الامتحان حتى الآن.</p>
      ) : (
        questions.map((question, index) => {
          const options = getOptions(question.options);

          return (
            <section
              key={question.id}
              className="exam-question"
            >
              <h3>
                السؤال {index + 1}: {question.prompt}
              </h3>

              <p>الدرجة: {question.points}</p>

              {options.length === 0 ? (
                <p>لا توجد اختيارات لهذا السؤال.</p>
              ) : (
                <div>
                  {options.map((option, optionIndex) => {
                    const value =
                      option &&
                      typeof option === "object"
                        ? option.value ?? option.label
                        : option;

                    const label =
                      option &&
                      typeof option === "object"
                        ? option.label ?? option.value
                        : option;

                    return (
                      <label
                        key={optionIndex}
                        style={{
                          display: "block",
                          margin: "12px 0",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={
                            answers[question.id] === value
                          }
                          onChange={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [question.id]: value,
                            }))
                          }
                        />{" "}
                        {String(label)}
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}

      <button
        type="button"
        onClick={() => navigate("/exams")}
      >
        العودة إلى الامتحانات
      </button>

      <p>
        تمت الإجابة عن {Object.keys(answers).length} من{" "}
        {questions.length} أسئلة.
      </p>
    </main>
  );
}
