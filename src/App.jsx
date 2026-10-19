
import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import ExamAttempt from "./pages/ExamAttempt.jsx";
import AdminExams from "./pages/AdminExams.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Subjects from "./pages/Subjects.jsx";
import SubjectDetails from "./pages/SubjectDetails.jsx";
import Sections from "./pages/Sections.jsx";
import Tasks from "./pages/Tasks.jsx";
import Timetable from "./pages/Timetable.jsx";
import Exams from "./pages/Exams.jsx";
import Admin from "./pages/Admin.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <div className="layout">
      <Sidebar />

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />


           <Route path="/admin/exams" element={<AdminExams />} />

           <Route path="/exams/:id" element={<ExamAttempt />} />



          <Route
            path="/subjects"
            element={<Subjects />}
          />
          

          <Route
            path="/subjects/:id"
            element={<SubjectDetails />}
          />

          <Route
            path="/sections"
            element={<Sections />}
          />

          <Route
            path="/subjects/:id/sections"
            element={<Sections />}
          />

          <Route
            path="/tasks"
            element={<Tasks />}
          />

          <Route
            path="/timetable"
            element={<Timetable />}
          />

          <Route
            path="/exams"
            element={<Exams />}
          />

          <Route
            path="/admin"
            element={<Admin />}
          />

          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </main>
    </div>
  );
}
