
import { useParams, useNavigate } from "react-router-dom";

export default function ExamAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <main dir="rtl" className="exam-attempt-page">
      <h1>حل الامتحان الإلكتروني</h1>

      <p>رقم الامتحان: {id}</p>

      <p>تم فتح صفحة الامتحان بنجاح.</p>

      <button type="button" onClick={() => navigate("/exams")}>
        العودة إلى الامتحانات
      </button>
    </main>
  );
}
