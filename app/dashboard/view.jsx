"use client";

import { useEffect, useState } from "react";

const links = {
  passenger: [{ href: "/my-tickets", title: "Mening chiptalarim", text: "Bron va elektron chiptalarni ko'rish." }],
  operator: [{ href: "/operator", title: "Operator paneli", text: "Avtobuslar, marshrutlar va reyslarni boshqarish." }],
  controller: [{ href: "/controller/scan", title: "Chipta tekshirish", text: "QR-kod orqali yo'lovchi chiptasini tekshirish." }],
  admin: [{ href: "/admin", title: "Admin paneli", text: "Operatorlarni tasdiqlash va boshqarish." }]
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/v1/auth/me").then((response) => response.json()).then((result) => {
      if (!result.success) throw new Error(result.error?.message || "Profilni yuklab bo'lmadi");
      setUser(result.data);
    }).catch((failure) => setError(failure.message));
  }, []);
  return <section className="container account-page"><p className="eyebrow">SHAXSIY KABINET</p><h1>{user ? `Salom, ${user.name}` : "Kabinet"}</h1>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="dashboard-grid">{(links[user?.role] || []).map((link) => <a className="dashboard-card" href={link.href} key={link.href}><span className="dashboard-arrow">↗</span><h2>{link.title}</h2><p>{link.text}</p></a>)}
      {user?.role === "passenger" && <a className="dashboard-card" href="/search"><span className="dashboard-arrow">↗</span><h2>Yangi reys topish</h2><p>Yo'nalishni tanlab, navbatdagi safaringizni rejalashtiring.</p></a>}
    </div>
    <button className="text-button logout-button" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); location.href = "/"; }}>Tizimdan chiqish</button>
  </section>;
}
