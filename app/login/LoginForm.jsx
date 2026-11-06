"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next = "/dashboard" }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [stage, setStage] = useState("credentials");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      if (mode === "register" && stage === "credentials") {
        const response = await fetch("/api/v1/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Ro'yxatdan o'tishda xatolik");
        setStage("verify");
        setMessage("SMS kodini kiriting. Demo uchun kod: 1111");
      } else if (stage === "verify") {
        const response = await fetch("/api/v1/auth/verify-otp", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Tasdiqlash amalga oshmadi");
        router.push(next);
      } else {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Kirish amalga oshmadi");
        router.push(next);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return <section className="auth-page"><div className="auth-card">
    <a className="back-link" href="/">← Bosh sahifa</a>
    <div className="auth-mark">BT</div><p className="eyebrow">BUS TICKET HISOBI</p>
    <h1>{stage === "verify" ? "Telefonni tasdiqlang" : mode === "login" ? "Xush kelibsiz" : "Hisob yarating"}</h1>
    <p className="muted">{stage === "verify" ? `${phone} raqamiga yuborilgan kodni kiriting.` : "Davom etish uchun telefon raqamingiz va parolingizni kiriting."}</p>
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && stage === "credentials" && <label className="field"><span>Ism-familiya</span><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
      {stage !== "verify" && <label className="field"><span>Telefon raqam</span><input required type="tel" placeholder="+998 90 123 45 67" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label>}
      {stage === "verify" && <label className="field"><span>Tasdiqlash kodi</span><input required inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" /></label>}
      {stage === "credentials" && <label className="field"><span>Parol</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
      {message && <div className={message.includes("Demo") ? "notice notice-info" : "notice notice-error"}>{message}</div>}
      <button className="button button-orange auth-submit" disabled={loading}>{loading ? "Kuting..." : stage === "verify" ? "Tasdiqlash" : mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}</button>
    </form>
    {stage === "credentials" && <p className="auth-switch">{mode === "login" ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "Ro'yxatdan o'tish" : "Kirish"}</button></p>}
  </div></section>;
}
