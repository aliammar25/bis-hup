
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const emptyForm = {
  title: "",
  description: "",
  subject_id: "",
  audience: "all",
  section_id: "",
  duration_minutes: 30,
  pass_mark: 50,
  sort_order: 0,
};

const emptyQuestion = {
  prompt: "",
  question_type: "mcq",
  points: 1,
  sort_order: 0,
  options: ["", "", "", ""],
  correct_answer: "A",
};

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [selectedExam, setSelectedExam] = useState("");
  const [questionForm, setQuestionForm] = useState({
    ...emptyQuestion,
  });
  const [editingQuestions, setEditingQuestions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({ ...emptyForm });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [examResult, subjectResult, sectionResult] =
        await Promise.all([
          supabase
            .from("exams")
            .select("*")
            .order("sort_order", { ascending: true }),

          supabase
            .from("subjects")
            .select("id, name")
            .order("id"),

          supabase
            .from("sections")
            .select("id, name, subject_id")
            .order("name"),
        ]);

      if (examResult.error) throw examResult.error;
      if (subjectResult.error) throw subjectResult.error;
      if (sectionResult.error) throw sectionResult.error;

      setExams(examResult.data ?? []);
      setSubjects(subjectResult.data ?? []);
      setSections(sectionResult.data ?? []);
    } catch (err) {
      setError(err.message || "فشل تحميل البيانات.");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions(examId) {
    setLoadingQuestions(true);
    setError("");
    setMessage("");

    try {
      const { data, error: queryError } = await supabase
        .from("exam_questions")
        .select(
          "id, exam_id, prompt, question_type, options, points, sort_order"
        )
        .eq("exam_id", examId)
        .order("sort_order", { ascending: true });

      if (queryError) throw queryError;

      setQuestions(data ?? []);
    } catch (err) {
      setError(err.message || "فشل تحميل الأسئلة.");
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadQuestions(selectedExam);
    } else {
      setQuestions([]);
    }
  }, [selectedExam]);

  const availableSections = sections.filter(
    (section) =>
      !form.subject_id ||
      String(section.subject_id) === String(form.subject_id)
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "subject_id" ? { section_id: "" } : {}),
    }));

    setMessage("");
  }

  function updateQuestionField(event) {
    const { name, value } = event.target;

    setQuestionForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "question_type"
        ? {
            correct_answer:
              value === "true_false" ? "true" : "A",
          }
        : {}),
    }));
  }

  function updateOption(index, value) {
    setQuestionForm((current) => {
      const options = [...current.options];
      options[index] = value;

      return { ...current, options };
    });
  }

  async function createExam(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("اكتب اسم الامتحان.");
      return;
    }

    if (
      form.audience === "section" &&
      !form.section_id
    ) {
      setError("اختار السكشن المطلوب.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        subject_id: form.subject_id
          ? Number(form.subject_id)
          : null,
        audience: form.audience,
        section_id:
          form.audience === "section"
            ? form.section_id
            : null,
        duration_minutes: Number(form.duration_minutes),
        pass_mark: Number(form.pass_mark),
        sort_order: Number(form.sort_order),
        is_published: false,
      };

      const { data, error: saveError } = await supabase
        .from("exams")
        .insert(payload)
        .select("id")
        .single();

      if (saveError) throw saveError;

      setForm({ ...emptyForm });
      setSelectedExam(data.id);
      await loadData();

      setMessage(
        "تم إنشاء الامتحان كمسودة. يمكنك الآن إضافة الأسئلة."
      );
    } catch (err) {
      setError(err.message || "فشل إنشاء الامتحان.");
    } finally {
      setSaving(false);
    }
  }

  async function createQuestion(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedExam) {
      setError("اختار امتحانًا أولًا.");
      return;
    }

    if (!questionForm.prompt.trim()) {
      setError("اكتب نص السؤال.");
      return;
    }

    let options = [];

    if (questionForm.question_type === "mcq") {
      const filledOptions = questionForm.options
        .map((text, index) => ({
          value: String.fromCharCode(65 + index),
          text: text.trim(),
        }))
        .filter((option) => option.text !== "");

      if (filledOptions.length < 2) {
        setError("اكتب اختيارين على الأقل.");
        return;
      }

      if (
        !filledOptions.some(
          (option) => option.value === questionForm.correct_answer
        )
      ) {
        setError("اختار إجابة صحيحة موجودة ضمن الاختيارات.");
        return;
      }

      options = filledOptions;
    } else {
      options = [
        { value: "true", text: "صح" },
        { value: "false", text: "خطأ" },
      ];
    }

    setSaving(true);

    let questionId = null;

    try {
      const { data: question, error: questionError } =
        await supabase
          .from("exam_questions")
          .insert({
            exam_id: selectedExam,
            prompt: questionForm.prompt.trim(),
            question_type: questionForm.question_type,
            options,
            points: Number(questionForm.points),
            sort_order: Number(questionForm.sort_order),
          })
          .select("id")
          .single();

      if (questionError) throw questionError;

      questionId = question.id;

      const answer =
        questionForm.question_type === "true_false"
          ? questionForm.correct_answer === "true"
          : questionForm.correct_answer;

      const { error: answerError } = await supabase
        .from("exam_answer_keys")
        .insert({
          question_id: questionId,
          correct_answer: answer,
        });

      if (answerError) {
        // محاولة حذف السؤال إذا فشل حفظ مفتاح الإجابة
        await supabase
          .from("exam_questions")
          .delete()
          .eq("id", questionId);

        throw answerError;
      }

      setQuestionForm({ ...emptyQuestion });
      setMessage("تم حفظ السؤال والإجابة الصحيحة بنجاح.");
      await loadQuestions(selectedExam);
    } catch (err) {
      setError(err.message || "فشل حفظ السؤال.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(questionId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف السؤال؟"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const { error: answerError } = await supabase
        .from("exam_answer_keys")
        .delete()
        .eq("question_id", questionId);

      if (answerError) throw answerError;

      const { error: questionError } = await supabase
        .from("exam_questions")
        .delete()
        .eq("id", questionId);

      if (questionError) throw questionError;

      setMessage("تم حذف السؤال.");
      await loadQuestions(selectedExam);
    } catch (err) {
      setError(err.message || "فشل حذف السؤال.");
    }
  }

  async function togglePublish(exam) {
    setError("");
    setMessage("");

    if (!exam.is_published) {
      const { count, error: countError } = await supabase
        .from("exam_questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", exam.id);

      if (countError) {
        setError(countError.message);
        return;
      }

      if (!count) {
        setError("أضف سؤالًا واحدًا على الأقل قبل النشر.");
        return;
      }

      const { data: questionRows, error: questionsError } =
        await supabase
          .from("exam_questions")
          .select("id")
          .eq("exam_id", exam.id);

      if (questionsError) {
        setError(questionsError.message);
        return;
      }

      const ids = (questionRows ?? []).map((question) => question.id);

      const { data: keys, error: keysError } = await supabase
        .from("exam_answer_keys")
        .select("question_id")
        .in("question_id", ids);

      if (keysError) {
        setError(keysError.message);
        return;
      }

      if ((keys ?? []).length !== ids.length) {
        setError("تأكد من وجود إجابة صحيحة محفوظة لكل سؤال.");
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("exams")
      .update({ is_published: !exam.is_published })
      .eq("id", exam.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      exam.is_published
        ? "تم إلغاء نشر الامتحان."
        : "تم نشر الامتحان."
    );

    await loadData();
  }

  if (loading) {
    return <p dir="rtl">جاري تحميل بيانات الامتحانات...</p>;
  }

  return (
    <main dir="rtl" className="admin-exams">
      <h1>إدارة الامتحانات</h1>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <form onSubmit={createExam}>
        <h2>إنشاء امتحان جديد</h2>

        <label>
          اسم الامتحان
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            required
            placeholder="مثال: امتحان قواعد البيانات"
          />
        </label>

        <label>
          الوصف
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            placeholder="وصف مختصر للامتحان"
          />
        </label>

        <label>
          المادة
          <select
            name="subject_id"
            value={form.subject_id}
            onChange={updateField}
          >
            <option value="">اختر المادة (اختياري)</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          الامتحان موجّه إلى
          <select
            name="audience"
            value={form.audience}
            onChange={updateField}
          >
            <option value="all">كل الطلاب</option>
            <option value="section">سكشن محدد</option>
          </select>
        </label>

        {form.audience === "section" && (
          <label>
            السكشن
            <select
              name="section_id"
              value={form.section_id}
              onChange={updateField}
              required
            >
              <option value="">اختر السكشن</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          مدة الامتحان بالدقائق
          <input
            type="number"
            name="duration_minutes"
            min="1"
            value={form.duration_minutes}
            onChange={updateField}
            required
          />
        </label>

        <label>
          درجة النجاح (%)
          <input
            type="number"
            name="pass_mark"
            min="0"
            max="100"
            value={form.pass_mark}
            onChange={updateField}
            required
          />
        </label>

        <label>
          ترتيب الامتحان
          <input
            type="number"
            name="sort_order"
            value={form.sort_order}
            onChange={updateField}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "جاري الحفظ..." : "إنشاء الامتحان"}
        </button>
      </form>

      <hr />

      <h2>الامتحانات الموجودة</h2>

      {exams.length === 0 ? (
        <p>لا توجد امتحانات حتى الآن.</p>
      ) : (
        exams.map((exam) => (
          <article key={exam.id} className="exam-card">
            <h3>{exam.title}</h3>

            {exam.description && <p>{exam.description}</p>}

            <p>
              الحالة: {exam.is_published ? "منشور" : "مسودة"}
            </p>

            <p>
              الجمهور:{" "}
              {exam.audience === "all"
                ? "كل الطلاب"
                : "سكشن محدد"}
            </p>

            <p>المدة: {exam.duration_minutes} دقيقة</p>

            <button
              type="button"
              onClick={() => {
                setSelectedExam(exam.id);
                setEditingQuestions(true);
                setQuestionForm({ ...emptyQuestion });
                setMessage("");
                setError("");
              }}
            >
              إضافة وإدارة الأسئلة
            </button>

            <button
              type="button"
              onClick={() => togglePublish(exam)}
              disabled={saving}
            >
              {exam.is_published
                ? "إلغاء النشر"
                : "نشر الامتحان"}
            </button>
          </article>
        ))
      )}

      {editingQuestions && selectedExam && (
        <section className="exam-card question-editor">
          <h2>إضافة سؤال للامتحان</h2>

          <label>
            الامتحان المحدد
            <select
              value={selectedExam}
              onChange={(event) => {
                setSelectedExam(event.target.value);
                setQuestionForm({ ...emptyQuestion });
              }}
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={createQuestion}>
            <label>
              نص السؤال
              <textarea
                value={questionForm.prompt}
                onChange={(event) =>
                  setQuestionForm((current) => ({
                    ...current,
                    prompt: event.target.value,
                  }))
                }
                required
                placeholder="اكتب السؤال هنا..."
              />
            </label>

            <label>
              نوع السؤال
              <select
                name="question_type"
                value={questionForm.question_type}
                onChange={updateQuestionField}
              >
                <option value="mcq">اختيار من متعدد</option>
                <option value="true_false">صح أو خطأ</option>
              </select>
            </label>

            {questionForm.question_type === "mcq" && (
              <>
                {questionForm.options.map((option, index) => (
                  <label key={index}>
                    الاختيار {String.fromCharCode(65 + index)}
                    <input
                      value={option}
                      onChange={(event) =>
                        updateOption(index, event.target.value)
                      }
                      placeholder={`اكتب الاختيار ${index + 1}`}
                    />
                  </label>
                ))}

                <label>
                  الإجابة الصحيحة
                  <select
                    value={questionForm.correct_answer}
                    onChange={(event) =>
                      setQuestionForm((current) => ({
                        ...current,
                        correct_answer: event.target.value,
                      }))
                    }
                  >
                    {questionForm.options.map((option, index) => {
                      const value = String.fromCharCode(65 + index);

                      return option.trim() ? (
                        <option key={value} value={value}>
                          {value} - {option}
                        </option>
                      ) : null;
                    })}
                  </select>
                </label>
              </>
            )}

            {questionForm.question_type === "true_false" && (
              <label>
                الإجابة الصحيحة
                <select
                  value={questionForm.correct_answer}
                  onChange={(event) =>
                    setQuestionForm((current) => ({
                      ...current,
                      correct_answer: event.target.value,
                    }))
                  }
                >
                  <option value="true">صح</option>
                  <option value="false">خطأ</option>
                </select>
              </label>
            )}

            <label>
              درجة السؤال
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={questionForm.points}
                onChange={(event) =>
                  setQuestionForm((current) => ({
                    ...current,
                    points: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              ترتيب السؤال
              <input
                type="number"
                min="0"
                value={questionForm.sort_order}
                onChange={(event) =>
                  setQuestionForm((current) => ({
                    ...current,
                    sort_order: event.target.value,
                  }))
                }
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ السؤال"}
            </button>
          </form>

          <hr />

          <h2>أسئلة الامتحان</h2>

          {loadingQuestions ? (
            <p>جاري تحميل الأسئلة...</p>
          ) : questions.length === 0 ? (
            <p>لم تتم إضافة أسئلة لهذا الامتحان بعد.</p>
          ) : (
            questions.map((question, index) => (
              <article key={question.id} className="exam-card">
                <h3>
                  {index + 1}. {question.prompt}
                </h3>

                <p>
                  النوع:{" "}
                  {question.question_type === "mcq"
                    ? "اختيار من متعدد"
                    : "صح أو خطأ"}
                </p>

                <p>الدرجة: {question.points}</p>

                {Array.isArray(question.options) &&
                  question.options.map((option) => (
                    <p key={option.value}>
                      {option.value}. {option.text}
                    </p>
                  ))}

                <button
                  type="button"
                  onClick={() => deleteQuestion(question.id)}
                >
                  حذف السؤال
                </button>
              </article>
            ))
          )}

          <button
            type="button"
            onClick={() => setEditingQuestions(false)}
          >
            إغلاق محرر الأسئلة
          </button>
        </section>
      )}
    </main>
  );
}
