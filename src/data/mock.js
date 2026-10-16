// Mock data — replace with Supabase tables later (see services/api.js)
export const subjects = [
  { id: 1, name: "نظم دعم القرار", code: "BIS401", doctor_name: "د. أحمد سمير" },
  { id: 2, name: "إدارة قواعد البيانات", code: "BIS402", doctor_name: "د. منى حسن" },
  { id: 3, name: "ذكاء الأعمال", code: "BIS403", doctor_name: "د. خالد فؤاد" },
  { id: 4, name: "التجارة الإلكترونية", code: "BIS404", doctor_name: "د. هالة عادل" },
];
export const lectures = [
  { id: 1, subject_id: 1, title: "مقدمة في نظم دعم القرار", week_number: 1, file_url: "#" },
  { id: 2, subject_id: 1, title: "نماذج اتخاذ القرار", week_number: 2, file_url: "#" },
  { id: 3, subject_id: 2, title: "Normalization", week_number: 1, file_url: "#" },
  { id: 4, subject_id: 2, title: "SQL Joins & Subqueries", week_number: 2, file_url: "#" },
  { id: 5, subject_id: 3, title: "Data Warehousing", week_number: 1, file_url: "#" },
  { id: 6, subject_id: 4, title: "نماذج الأعمال الإلكترونية", week_number: 1, file_url: "#" },
];
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString();
export const tasks = [
  { id: 1, subject_id: 2, title: "تصميم ERD لنظام مكتبة", description: "ارسم ERD كامل مع شرح العلاقات.", due_date: inDays(2) },
  { id: 2, subject_id: 1, title: "ملخص بحثي عن DSS", description: "صفحتان عن تطبيق عملي.", due_date: inDays(6) },
  { id: 3, subject_id: 3, title: "Dashboard بـ Power BI", description: "لوحة بيانات من dataset مرفق.", due_date: inDays(-1) },
  { id: 4, subject_id: 4, title: "تحليل متجر إلكتروني", description: "حلل متجرًا مصريًا واحدًا.", due_date: inDays(10) },
];
export const timetable = [
  { id: 1, subject_id: 1, day_of_week: "السبت", start_time: "09:00", end_time: "11:00", location: "قاعة 3" },
  { id: 2, subject_id: 2, day_of_week: "الأحد", start_time: "10:00", end_time: "12:00", location: "معمل 1" },
  { id: 3, subject_id: 3, day_of_week: "الاثنين", start_time: "09:00", end_time: "11:00", location: "قاعة 5" },
  { id: 4, subject_id: 4, day_of_week: "الثلاثاء", start_time: "12:00", end_time: "14:00", location: "قاعة 2" },
  { id: 5, subject_id: 2, day_of_week: "الأربعاء", start_time: "09:00", end_time: "11:00", location: "قاعة 3" },
];
