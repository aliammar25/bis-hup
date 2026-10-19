import { NavLink } from "react-router-dom";
import { useState } from "react";


const links = [
  ["/", "الرئيسية"],
  ["/subjects", "المواد"],
  ["/sections", "السكاشن "],
  ["/tasks", "التاسكات"],
  ["/timetable", "الجدول"],
  ["/admin", "دخول الأدمن"],
];

export default function Sidebar() {
  const [dark, setDark] = useState(matchMedia("(prefers-color-scheme: dark)").matches);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };
  return (
    <aside>
      <div className="logo">BIS Hub</div>
      <div className="tag">Everything You Need for Your Academic Year</div>
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>
          {label}
        </NavLink>
      ))}
      <div className="sp" />
      <button className="btn g" onClick={toggle}>🌓 المظهر</button>
    </aside>
  );
}
