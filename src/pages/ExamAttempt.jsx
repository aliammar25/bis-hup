import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getExamForAttempt,
  submitExamAttempt,
} from "../services/api.js";

function getOptions(options) {
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (typeof option === "string" || typeof option === "number") {
        return { label: String(option), value: String(option) };
      }

      return {
        label: String(
          option?.text ??
            option?.label ??
            option?.option ??
            option?.value ??
            option?.key ??
            `اختيار ${index + 1}`
        ),
        value: String(
          option?.key ??
            option?.id ??
            option?.value ??
            String.fromCharCode(65 + index)
        ),
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
  const safeSeconds = Math.max(0, seconds ?? 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadExam() {
      try {
        setLoading(true);
        setError("");

        const response = await getExamForAttempt(id);

        if (!active) return;

        setExam(response.exam);
        setQuestions(response.questions ?? []);

        const duration = Number(response.exam.duration_minutes);

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
    async (automatic = false) => {
      if (submittingRef.current || submitted) return;

      if (!automatic) {
        const confirmed = window.confirm(
          "هل أنت متأكد من تسليم الامتحان؟ لن تتمكن من تعديل إجاباتك بعد التسليم."
        );

        if (!confirmed) return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError("");

      try {
        const submissionResult = await submitExamAttempt(id, answers);

        setResult(submissionResult);
        setSubmitted(true);
        setRemainingSeconds(0);

        window.alert(
          automatic
            ? "انتهى الوقت وتم تسليم الامتحان بنجاح."
            : "تم تسليم الامتحان وحفظ النتيجة بنجاح."
        );
      } catch (err) {
        console.error("Exam submission failed:", err);

        setSubmitError(
          err.message || "فشل تسليم الامتحان. حاول مرة أخرى."
        );

        window.alert(
          `فشل تسليم الامتحان: ${err.message || "خطأ غير معروف"}`
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [answers, id, submitted]
  );

  useEffect(() => {
    if (
      loading ||
      error ||
      submitted ||
      submitting ||
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
    submitting,
    remainingSeconds,
    handleSubmit,
  ]);

  if (loading) {
    return (
      <main dir="rtl" style={{ padding: 24 }}>
        جاري تحميل أسئلة الامتحان...
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" role="alert" style={{ padding: 24 }}>
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
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "20px 16px 110px",
        boxSizing: "border-box",
      }}
    >
      <h1>{exam?.title}</h1>

      {exam?.description && <p>{exam.description}</p>}

      <section
        aria-label="حالة الامتحان"
        style={{
          position: "sticky",
          top: 8,
          zIndex: 5,
          padding: 16,
          margin: "16px 0",
          background:
            remainingSeconds !== null && remainingSeconds < 60
              ? "#fee2e2"
              : "#eff6ff",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
          {formatTime(remainingSeconds)}
        </span>

        <p style={{ marginBottom: 0 }}>
          تمت الإجابة عن {answeredCount} من {questions.length} أسئلة.
        </p>
      </section>

      {submitError && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {submitError}
        </p>
      )}

      {result && (
        <section
          role="status"
          style={{
            margin: "20px 0",
            padding: 20,
            border: "1px solid #16a34a",
            borderRadius: 12,
            background: "#f0fdf4",
          }}
        >
          <h2>تم تسليم الامتحان بنجاح</h2>

          <p>
            الدرجة: <strong>{result.score}</strong> من{" "}
            <strong>{result.max_score}</strong>
          </p>

          <p>الإجابات الصحيحة: {result.correct_count}</p>
          <p>الإجابات الخاطئة: {result.wrong_count}</p>
        </section>
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
                        background: selected ? "#eff6ff" : "#fff",
                        cursor:
                          submitted || submitting
                            ? "not-allowed"
                            : "pointer",
                        opacity: submitted ? 0.7 : 1,
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.value}
                        checked={selected}
                        disabled={submitted || submitting}
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

      <footer
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          left: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          background: "#fff",
          borderTop: "1px solid #d1d5db",
          boxShadow: "0 -4px 14px rgba(0,0,0,0.08)",
        }}
      >
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitted || submitting || questions.length === 0}
          style={{
            minWidth: 180,
            padding: "13px 24px",
            border: 0,
            borderRadius: 10,
            background:
              submitted || submitting ? "#9ca3af" : "#16a34a",
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            cursor:
              submitted || submitting || questions.length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {submitting
            ? "جاري التسليم..."
            : submitted
              ? "تم تسليم الامتحان"
              : "تسليم الامتحان"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/exams")}
          style={{
            padding: "13px 18px",
            border: "1px solid #d1d5db",
            borderRadius: 10,
            background: "#fff",
            color: "#111827",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          العودة إلى الامتحانات
        </button>
      </footer>
    </main>
  );
}
