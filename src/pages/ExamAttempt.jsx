
import { useCallback, useEffect, useRef, useState } from "react";
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

      const value =
        option?.key ??
        option?.id ??
        option?.value ??
        String.fromCharCode(65 + index);

      return {
        label: String(
          option?.text ??
          option?.label ??
          option?.option ??
          option?.value ??
          option?.key ??
          `اختيار ${index + 1}`
        ),
        value: String(value),
      };
    });
  }

  if (options && typeof options === "object") {
    return Object.entries(options).map(([key, option]) => ({
      label: String(
        typeof option === "object" && option !== null
          ? option.text ?? option.label ?? option.value ?? key
          : option
      ),
      value: String(
        typeof option === "object" && option !== null
          ? option.key ?? option.id ?? key
          : key
      ),
    }));
  }

  return [];
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function ExamAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submittingRef = useRef(false);

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

        const duration = Number(result.exam.duration_minutes);

        if (Number.isFinite(duration) && duration > 0) {
          setRemainingSeconds(Math.floor(duration * 60));
        } else {
          setError("مدة الامتحان غير صحيحة.");
        }
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

  const handleSubmit = useCallback(
    (automatic = false) => {
      if (submittingRef.current || submitted) return;

      if (!automatic) {
        const confirmed = window.confirm(
          "هل أنت متأكد من تسليم الامتحان؟"
        );

        if (!confirmed) return;
      }

      submittingRef.current = true;
      setSubmitted(true);

      // ربط التسليم الفعلي بـ Supabase سيتم في الخطوة التالية.
      console.log("Exam answers ready for submission:", {
        examId: id,
        answers,
      });

      window.alert(
        automatic
          ? "انتهى وقت الامتحان. تم إيقاف الإجابة، لكن يلزم ربط التسليم بقاعدة البيانات لحفظ المحاولة وتصحيحها."
          : "تم إيقاف الإجابة. لم يتم حفظ المحاولة أو تصحيحها بعد؛ يجب ربط زر التسليم بدالة Supabase."
      );
    },
    [answers, id, submitted]
  );

  useEffect(() => {
    if (
      loading ||
      error ||
      submitted ||
      remainingSeconds === null
    ) {
      return;
    }

    if (remainingSeconds <= 0) {
      handleSubmit(true);
      return;
    }

    const timerId = window.setTimeout(() => {
      setRemainingSeconds((current) =>
        current === null ? null : Math.max(0, current - 1)
      );
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [
    loading,
    error,
    submitted,
    remainingSeconds,
    handleSubmit,
  ]);

  if (loading) {
    return <p dir="rtl">جاري تحميل أسئلة الامتحان...</p>;
  }

  if (error) {
    return (
      <main dir="rtl" role="alert">
        <h2>تعذر فتح الامتحان</h2>
        <p>{error}</p>
        <button type="button" onClick={() => navigate("/exams")}>
          العودة إلى الامتحانات
        </button>
      </main>
    );
  }

  const answeredCount = questions.filter(
    (question) => answers[question.id] !== undefined
  ).length;

  return (
    <main
      dir="rtl"
      className="exam-attempt-page"
      style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}
    >
      <h1>{exam?.title}</h1>

      {exam?.description && <p>{exam.description}</p>}

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          padding: 16,
          margin: "16px 0",
          background: remainingSeconds < 60 ? "#fee2e2" : "#eff6ff",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
        }}
      >
        <strong>الوقت المتبقي: </strong>
        <span
          style={{
            fontSize: 24,
            fontWeight: "bold",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatTime(remainingSeconds ?? 0)}
        </span>

        <p>
          تمت الإجابة عن {answeredCount} من {questions.length} أسئلة.
        </p>
      </div>

      {submitted && (
        <p role="status">
          توقفت الإجابة عن الامتحان. لم يتم حفظ النتيجة بعد.
        </p>
      )}

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
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 12,
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
                    String(answers[question.id] ?? "") === option.value;

                  return (
                    <label
                      key={`${question.id}-${option.value}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        margin: "10px 0",
                        padding: 12,
                        border: selected
                          ? "2px solid #2563eb"
                          : "1px solid #ddd",
                        borderRadius: 8,
                        background: selected ? "#eff6ff" : "transparent",
                        cursor: submitted ? "not-allowed" : "pointer",
                        opacity: submitted ? 0.7 : 1,
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.value}
                        checked={selected}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            [question.id]: option.value,
                          }))
                        }
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

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 24,
        }}
      >
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitted || questions.length === 0}
          style={{
            padding: "12px 24px",
            border: 0,
            borderRadius: 8,
            background: submitted ? "#9ca3af" : "#16a34a",
            color: "#fff",
            fontWeight: "bold",
            cursor: submitted ? "not-allowed" : "pointer",
          }}
        >
          {submitted ? "تم إيقاف الإجابة" : "تسليم الامتحان"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/exams")}
        >
          العودة إلى الامتحانات
        </button>
      </div>
    </main>
  );
}
