
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

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";

  return Number(number.toFixed(2)).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function getGrade(percentage) {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جدًا";
  if (percentage >= 65) return "جيد";
  if (percentage >= 50) return "مقبول";
  return "راسب";
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

        // النتيجة ستظهر في الصفحة مباشرة بعد التسليم.
      } catch (err) {
        console.error("Exam submission failed:", err);

        setSubmitError(
          err.message || "فشل تسليم الامتحان. حاول مرة أخرى."
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

  const score = Number(result?.score);
  const maxScore = Number(result?.max_score);

  const validResult =
    result !== null &&
    Number.isFinite(score) &&
    Number.isFinite(maxScore) &&
    maxScore > 0;

  const percentage = validResult
    ? Math.min(100, Math.max(0, (score / maxScore) * 100))
    : 0;

  const passed = validResult && percentage >= 50;

  const resultColor = passed ? "#15803d" : "#dc2626";
  const resultBackground = passed ? "#f0fdf4" : "#fef2f2";
  const resultBorder = passed ? "#86efac" : "#fca5a5";

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

      {!submitted && (
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
      )}

      {submitError && (
        <section
          role="alert"
          style={{
            margin: "16px 0",
            padding: 14,
            borderRadius: 10,
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
          }}
        >
          <strong>تعذر تسليم الامتحان</strong>
          <p style={{ marginBottom: 0 }}>{submitError}</p>
        </section>
      )}

      {submitted && (
        <section
          role="status"
          aria-live="polite"
          style={{
            margin: "24px 0",
            padding: "28px 20px",
            border: `2px solid ${
              validResult ? resultBorder : "#cbd5e1"
            }`,
            borderRadius: 18,
            background: validResult ? resultBackground : "#f8fafc",
            color: validResult ? resultColor : "#334155",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {validResult ? (passed ? "🏆" : "📝") : "✓"}
          </div>

          <h2 style={{ margin: "0 0 18px" }}>
            تم تسليم الامتحان بنجاح
          </h2>

          {validResult ? (
            <>
              <p style={{ margin: "8px 0", fontSize: 18 }}>
                درجتك النهائية
              </p>

              <div
                style={{
                  fontSize: "clamp(34px, 8vw, 52px)",
                  fontWeight: 800,
                  lineHeight: 1.3,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatNumber(score)} / {formatNumber(maxScore)}
              </div>

              <div
                style={{
                  width: "100%",
                  maxWidth: 380,
                  height: 12,
                  margin: "20px auto 10px",
                  overflow: "hidden",
                  borderRadius: 99,
                  background: "#e5e7eb",
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: resultColor,
                    borderRadius: 99,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              <p style={{ fontSize: 20, fontWeight: 700 }}>
                النسبة المئوية: {formatNumber(percentage)}%
              </p>

              <div
                style={{
                  display: "inline-block",
                  margin: "8px 0 14px",
                  padding: "10px 24px",
                  borderRadius: 999,
                  background: resultColor,
                  color: "#fff",
                  fontSize: 19,
                  fontWeight: 800,
                }}
              >
                {passed ? "ناجح ✓" : "راسب ✗"}
              </div>

              <h3 style={{ margin: "8px 0 18px" }}>
                التقدير: {getGrade(percentage)}
              </h3>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    padding: 14,
                    minWidth: 130,
                    borderRadius: 12,
                    background: "#fff",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    الإجابات الصحيحة
                  </div>
                  <strong style={{ fontSize: 24 }}>
                    {result.correct_count ?? 0}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 14,
                    minWidth: 130,
                    borderRadius: 12,
                    background: "#fff",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    الإجابات الخاطئة
                  </div>
                  <strong style={{ fontSize: 24 }}>
                    {result.wrong_count ?? 0}
                  </strong>
                </div>
              </div>

              <p style={{ marginTop: 20, marginBottom: 0 }}>
                {passed
                  ? "أحسنت! لقد حققت درجة النجاح في هذا الامتحان."
                  : "لم تحقق درجة النجاح هذه المرة. راجع دروسك واستعد للمحاولة القادمة."}
              </p>
            </>
          ) : (
            <p>
              تم التسليم، لكن لم تصل درجة صالحة من قاعدة البيانات. راجع
              استجابة دالة التصحيح في api.js.
            </p>
          )}
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
                background: submitted ? "#f8fafc" : "#fff",
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
        {!submitted && (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting || questions.length === 0}
            style={{
              minWidth: 180,
              padding: "13px 24px",
              border: 0,
              borderRadius: 10,
              background: submitting ? "#9ca3af" : "#16a34a",
              color: "#fff",
              fontSize: 16,
              fontWeight: "bold",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "جاري التسليم..." : "تسليم الامتحان"}
          </button>
        )}

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
