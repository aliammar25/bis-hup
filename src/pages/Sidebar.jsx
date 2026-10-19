
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "الرئيسية", icon: "🏠", end: true },
  { to: "/subjects", label: "المواد الدراسية", icon: "📚" },
  { to: "/sections", label: "السكاشن", icon: "👨‍🏫" },
  { to: "/tasks", label: "التاسكات", icon: "📝" },
  { to: "/timetable", label: "الجدول الدراسي", icon: "📅" },
  { to: "/admin", label: "لوحة الأدمن", icon: "⚙️" },
];

export default function Sidebar() {
    
  return (
    <aside
      style={{
        width: "230px",
        minWidth: "230px",
        minHeight: "100vh",
        padding: "20px 14px",
        background: "var(--card, white)",
        borderInlineEnd: "1px solid var(--bd, #ddd)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flexShrink: 0,
      }}
    >
      <div className="sidebar-brand">
        <h2 style={{ margin: 0 }}>BIS Hub</h2>
        <p className="mut">مساحتك الدراسية</p>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px",
              borderRadius: "8px",
              textDecoration: "none",
              color: isActive
                ? "white"
                : "var(--tx, #222)",
              background: isActive
                ? "var(--pr, #4f46e5)"
                : "transparent",
            })}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: "auto" }}>
        <p className="mut">BIS Hub © 2026</p>
      </div>
    </aside>
  );
}
