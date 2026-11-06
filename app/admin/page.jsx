"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [operators, setOperators] = useState([]);
  const [error, setError] = useState("");
  const load = () => fetch("/api/v1/admin/operators").then((response) => response.json()).then((result) => {
    if (!result.success) throw new Error(result.error?.message || "Operatorlarni yuklab bo'lmadi");
    setOperators(result.data);
  }).catch((failure) => setError(failure.message));
  useEffect(() => { load(); }, []);
  async function setStatus(id, status) {
    const response = await fetch(`/api/v1/admin/operators/${id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (!response.ok) setError(result.error?.message || "Holatni o'zgartirib bo'lmadi");
    else setOperators((items) => items.map((operator) => operator._id === id ? result.data : operator));
  }
  return <section className="container account-page"><p className="eyebrow">PLATFORMA BOSHQARUVI</p><h1>Admin paneli</h1>
    <p className="muted">Tashuvchi kompaniyalar holatini ko'rib chiqing va tasdiqlang.</p>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>Kompaniya</th><th>Telefon</th><th>Holat</th><th>Komissiya</th><th>Amal</th></tr></thead><tbody>
      {operators.map((operator) => <tr key={operator._id}><td>{operator.name}</td><td>{operator.phone || "—"}</td><td>{operator.status}</td><td>{operator.commissionPercent}%</td><td><button className="text-button" onClick={() => setStatus(operator._id, operator.status === "active" ? "blocked" : "active")}>{operator.status === "active" ? "Bloklash" : "Tasdiqlash"}</button></td></tr>)}
      {!operators.length && !error && <tr><td colSpan="5">Operatorlar topilmadi.</td></tr>}
    </tbody></table></div>
  </section>;
}
