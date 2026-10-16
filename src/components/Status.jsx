export default function Status({ loading, error, empty, children }) {
  if (loading) return <p className="mut">جاري التحميل...</p>;
  if (error) return <p className="mut" style={{ color: "var(--bad)" }}>حصل خطأ أثناء تحميل البيانات. حاول مرة أخرى.</p>;
  if (empty) return <p className="mut">لا يوجد محتوى بعد.</p>;
  return children;
}
