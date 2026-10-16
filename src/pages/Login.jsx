import { useState } from "react";
import { useAuth } from "../context/Auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await login(email, password); }
    catch { setErr("الإيميل أو كلمة المرور غير صحيحة."); }
    setBusy(false);
  };
  return (
    <>
      <h1>دخول الأدمن</h1>
      <form className="card" style={{ maxWidth: 340 }} onSubmit={submit}>
        <div className="bar" style={{ flexDirection: "column" }}>
          <input type="email" placeholder="الإيميل" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn" disabled={busy}>{busy ? "..." : "دخول"}</button>
        </div>
        {err && <p className="mut" style={{ color: "var(--bad)" }}>{err}</p>}
      </form>
    </>
  );
}
