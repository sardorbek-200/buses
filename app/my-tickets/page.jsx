"use client";

import { useEffect, useState } from "react";

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/v1/bookings").then((response) => response.json()).then((result) => {
      if (!result.success) throw new Error(result.error?.message || "Chiptalarni yuklab bo'lmadi");
      setBookings(result.data);
    }).catch((failure) => setError(failure.message));
  }, []);

  async function cancel(id) {
    const response = await fetch(`/api/v1/bookings/${id}/cancel`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) { setError(result.error?.message || "Bekor qilish amalga oshmadi"); return; }
    setBookings((items) => items.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
  }

  return <section className="container account-page"><p className="eyebrow">YO'LOVCHI KABINETI</p><h1>Mening chiptalarim</h1>
    {error && <div className="notice notice-error">{error}</div>}
    {!bookings.length && !error && <div className="empty-state"><div>▤</div><h2>Hozircha chiptalar yo'q</h2><p>Birinchi reysingizni qidirib ko'ring.</p><a className="button button-orange" href="/">Reys qidirish</a></div>}
    <div className="booking-list">{bookings.map((booking) => <article className="booking-card" key={booking.id}>
      <div><span className={`status-pill status-${booking.status}`}>{booking.status}</span><h2>{booking.from} <span>→</span> {booking.to}</h2><p>{booking.departAt ? new Date(booking.departAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }) : "Reys sanasi mavjud emas"}</p><small>Bron: {booking.code} · O'rindiq: {booking.passengers.map((passenger) => passenger.seatNumber).join(", ")}</small></div>
      <div className="booking-actions"><strong>{new Intl.NumberFormat("uz-UZ").format(booking.totalPrice)} so'm</strong>{booking.status === "pending" && <a className="button button-orange" href={`/checkout/${booking.id}`}>To'lov</a>}{booking.status === "paid" && <a className="button button-outline" href={`/checkout/${booking.id}`}>Chiptani ko'rish</a>}{["pending", "paid"].includes(booking.status) && <button className="text-button" onClick={() => cancel(booking.id)}>Bekor qilish</button>}</div>
    </article>)}</div>
  </section>;
}
