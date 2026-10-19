
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExamForAttempt } from "../services/api.js";

function getOptions(options) {
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (
        typeof option === "string" ||
        typeof option === "number"
      ) {
        return {
          label: String(option),
          value: String(option),
        };
      }

      if (option && typeof option === "object") {
        const value =
          option.key ??
          option.id ??
          option.value ??
          String.fromCharCode(65 + index);

        const label =
          option.text ??
          option.label ??
          option.option ??
          option.value ??
          option.key ??
          `اختيار ${index + 1}`;

        return {
          label: String(label),
          value: String(value),
        };
      }

      return {
        label: `اختيار ${index + 1}`,
        value: String.fromCharCode(65 + index),
      };
    });
  }

  if (options && typeof options === "object") {
    return Object.entries(options).map(([key, option]) => {
      if (option && typeof option === "object") {
        return {
          label: String(
            option.text ?? option.label ?? option.value ?? key
          ),
          value: String(option.key ?? option.id ?? key),
        };
      }

      return {
        label: String(option),
        value: String(key),
      };
    });
  }

  return [];
}

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
        setQuestions(result.questions ?? []);
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
        <button
          type="button"
          onClick={() => navigate("/exams")}
        >
          العودة إلى الامتحانات
        </button>
      </main>
    );
  }

  return (
    <main dir="rtl" className="exam-attempt-page">
      <h1>{exam?.title}</h1>

      {exam?.description && <p>{exam.description}</p>}

      <p>مدة الامتحان: {exam?.duration_minutes} دقيقة</p>
      <p>درجة النجاح: {exam?.pass_mark}%</p>
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
              style={{
                margin: "20px 0",
                padding: "16px",
                border: "1px solid #ddd",
                borderRadius: "12px",
              }}
            >
              <h3>
                السؤال {index + 1}: {question.prompt}
              </h3>

              <p>الدرجة: {question.points}</p>

              {options.length === 0 ? (
                <p>لا توجد اختيارات لهذا السؤال.</p>
              ) : (
                options.map((option) => {
                  const selected =
                    String(answers[question.id] ?? "") ===
                    option.value;

                  return (
                    <label
                      key={`${question.id}-${option.value}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        margin: "10px 0",
                        padding: "12px",
                        border: selected
                          ? "2px solid #2563eb"
                          : "1px solid #ddd",
                        borderRadius: "8px",
                        background: selected
                          ? "#eff6ff"
                          : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.value}
                        checked={selected}
                        onChange={() => {
                          setAnswers((previous) => ({
                            ...previous,
                            [question.id]: option.value,
                          }));
                        }}
                      />

                      <span>{option.label}</span>
                    </label>
                  );
                })
              )}
            </section>
          );
        })
      )}

      <p>
        تمت الإجابة عن{" "}
        {
          questions.filter(
            (question) =>
              answers[question.id] !== undefined
          ).length
        }{" "}
        من {questions.length} أسئلة.
      </p>

      <button
        type="button"
        onClick={() => navigate("/exams")}
      >
        العودة إلى الامتحانات
      </button>
    </main>
  );
}