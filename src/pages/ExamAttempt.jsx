
import { useParams, useNavigate } from "react-router-dom";

export default function ExamAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <main dir="rtl">
      <h1>حل الامتحان الإلكتروني</h1>
      <p>رقم الامتحان: {id}</p>
      <p>تم فتح الصفحة بنجاح.</p>

      <button onClick={() => navigate("/exams")}>
        العودة إلى الامتحانات
      </button>
    </main>
  );
}

