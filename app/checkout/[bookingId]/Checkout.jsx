"use client";

import { useEffect, useState } from "react";
import TicketQr from "@/components/TicketQr";

export default function Checkout({ bookingId }) {
  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    fetch(`/api/v1/bookings/${bookingId}`).then((response) => response.json()).then((result) => {
      if (!result.success) throw new Error(result.error?.message || "Bron topilmadi");
      setBooking(result.data);
      setSeconds(Math.max(0, Math.floor((new Date(result.data.expiresAt).getTime() - Date.now()) / 1000)));
      if (result.data.status === "paid") {
        setTickets((result.data.tickets || []).map((ticket) => ({ ...ticket, qr: "" })));
      }
    }).catch((failure) => setError(failure.message)).finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.expiresAt || booking.status !== "pending") return undefined;
    const timer = setInterval(() => setSeconds(Math.max(0, Math.floor((new Date(booking.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [booking]);

  async function pay() {
    setError("");
    try {
      const initResponse = await fetch(`/api/v1/payments/${bookingId}/init`, { method: "POST" });
      const init = await initResponse.json();
      if (!initResponse.ok) throw new Error(init.error?.message || "To'lovni boshlash amalga oshmadi");
      const response = await fetch(`/api/v1/payments/mock/${bookingId}/confirm`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "To'lov amalga oshmadi");
      setTickets(result.data.tickets);
      setBooking((current) => ({ ...current, status: "paid" }));
    } catch (failure) {
      setError(failure.message);
    }
  }

  if (loading) return <section className="container checkout-page"><div className="skeleton detail-skeleton" /></section>;
  if (!booking) return <section className="container checkout-page"><div className="notice notice-error">{error}</div></section>;
  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <section className="container checkout-page">
    <p className="eyebrow">BUYURTMANI TASDIQLASH</p>
    <h1>{booking.status === "paid" ? "Chipta tayyor!" : "To'lov va chipta"}</h1>
    {booking.status === "paid" ? <div className="tickets-grid">{tickets.map((ticket) => <article className="ticket-card" key={ticket.ticketNumber}>
      <div className="ticket-top"><div><span className="eyebrow">ELEKTRON CHIPTA</span><h2>{ticket.ticketNumber}</h2></div><span className="ticket-status">To'langan</span></div>
      {ticket.qr && <TicketQr value={ticket.qr} />}
      <p>O'rindiq: <strong>{ticket.seatNumber}</strong></p>
      <a className="button button-outline" href={`/api/v1/tickets/${ticket.id}/pdf`}>PDF chiptani yuklab olish</a>
    </article>)}</div> : <div className="checkout-grid">
      <div className="checkout-summary"><h2>Bron ma'lumotlari</h2><p><span>Yo'nalish</span><strong>{booking.tripId?.routeId?.fromCityId?.name} → {booking.tripId?.routeId?.toCityId?.name}</strong></p>
        <p><span>Bron raqami</span><strong>{booking.code}</strong></p><p><span>Yo'lovchilar</span><strong>{booking.passengers.length} kishi</strong></p>
        <p><span>O'rindiqlar</span><strong>{booking.passengers.map((passenger) => passenger.seatNumber).join(", ")}</strong></p>
        <div className="checkout-total"><span>Jami to'lov</span><strong>{new Intl.NumberFormat("uz-UZ").format(booking.totalPrice)} so'm</strong></div>
      </div>
      <div className="payment-box"><span className="payment-clock">◷</span><h2>Joylar siz uchun ushlab turildi</h2><p>To'lovni yakunlash uchun qolgan vaqt:</p><strong className="countdown">{formattedTime}</strong>
        {error && <div className="notice notice-error">{error}</div>}
        <button className="button button-orange auth-submit" onClick={pay} disabled={seconds <= 0}>Test to'lovni amalga oshirish</button>
        <small>Demo muhitida to'lov sinovi. Click va Payme ulanishi provayder shartnomalarini talab qiladi.</small>
      </div>
    </div>}
    {error && booking.status === "paid" && <div className="notice notice-error">{error}</div>}
  </section>;
}
