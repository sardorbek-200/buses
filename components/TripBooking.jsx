"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

export default function TripBooking({ tripId }) {
  const router = useRouter();
  const [trip, setTrip] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [passengerInfo, setPassengerInfo] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshSeats = useCallback(async () => {
    const response = await fetch(`/api/v1/trips/${tripId}/seats`, { cache: "no-store" });
    const result = await response.json();
    if (!result.success) throw new Error(result.error?.message || "O'rindiqlarni yuklab bo'lmadi");
    setSeats(result.data.seats);
  }, [tripId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/v1/trips/${tripId}`).then((response) => response.json()),
      refreshSeats()
    ]).then(([result]) => {
      if (active && result.success) setTrip(result.data);
      else if (active) setError(result.error?.message || "Reys topilmadi");
    }).catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    const socket = io({ transports: ["websocket", "polling"] });
    socket.emit("trip:join", tripId);
    const update = () => refreshSeats().catch((failure) => setError(failure.message));
    socket.on("seat:locked", update);
    socket.on("seat:released", update);
    socket.on("seat:sold", update);
    return () => { active = false; socket.emit("trip:leave", tripId); socket.disconnect(); };
  }, [tripId, refreshSeats]);

  function toggleSeat(number) {
    setError("");
    setSelected((previous) => {
      if (previous.includes(number)) {
        setPassengerInfo((info) => { const next = { ...info }; delete next[number]; return next; });
        return previous.filter((item) => item !== number);
      }
      if (previous.length >= 5) { setError("Bir bron uchun ko'pi bilan 5 ta joy tanlanadi"); return previous; }
      setPassengerInfo((info) => ({ ...info, [number]: { fullName: "", gender: "male", phone: "" } }));
      return [...previous, number];
    });
  }

  async function bookSeats(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, passengers: selected.map((seatNumber) => ({ seatNumber, ...passengerInfo[seatNumber] })) })
    });
    const result = await response.json();
    if (response.status === 401) { router.push(`/login?next=${encodeURIComponent(`/trips/${tripId}`)}`); return; }
    if (!response.ok) { setError(result.error?.message || "Bron qilish amalga oshmadi"); await refreshSeats(); return; }
    router.push(`/checkout/${result.data.bookingId}`);
  }

  if (loading) return <div className="container"><div className="skeleton detail-skeleton" /></div>;
  if (!trip) return <section className="container"><div className="notice notice-error">{error || "Reys topilmadi"}</div></section>;
  const formatPrice = new Intl.NumberFormat("uz-UZ").format(trip.price);

  return (
    <section className="container trip-detail">
      <a className="back-link" href="/search">← Reyslar ro'yxatiga</a>
      <div className="detail-heading"><div><p className="eyebrow">REYS MA'LUMOTI</p><h1>{trip.from} <span>→</span> {trip.to}</h1><p>{new Date(trip.departAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })} · {trip.operator} · {trip.bus.model}</p></div><div className="detail-price"><strong>{formatPrice} so'm</strong><span>bir o'rindiq uchun</span></div></div>
      <div className="seat-layout">
        <div className="seat-legend"><span><i className="seat-dot available" /> Bo'sh</span><span><i className="seat-dot held" /> Ushlangan</span><span><i className="seat-dot sold" /> Band</span><span><i className="seat-dot selected" /> Tanlangan</span></div>
        <div className="bus-frame"><div className="driver-cabin">Haydovchi</div><div className="seat-grid" style={{ gridTemplateColumns: `repeat(${trip.bus.layout.cols}, minmax(42px, 1fr))` }}>
          {trip.bus.layout.cells.map((cell, index) => {
            if (cell.kind === "aisle" || cell.kind === "empty") return <div className="seat-gap" key={index} />;
            if (cell.kind === "driver") return <div className="seat-driver" key={index}>🚍</div>;
            const seat = seats.find((item) => item.seatNumber === cell.seatNumber);
            const status = selected.includes(cell.seatNumber) ? "selected" : seat?.status || "available";
            return <button type="button" key={index} disabled={status === "sold" || status === "held"}
              className={`seat seat-${status}`} onClick={() => toggleSeat(cell.seatNumber)} aria-label={`${cell.seatNumber}-o'rindiq, ${status}`}>
              {cell.seatNumber}
            </button>;
          })}
        </div></div>
      </div>
      <form className="passenger-form" onSubmit={bookSeats}>
        <h2>Yo'lovchi ma'lumotlari</h2>
        {!selected.length && <p className="muted">Davom etish uchun avtobus sxemasidan joy tanlang (ko'pi bilan 5 ta).</p>}
        {selected.map((seatNumber, index) => <fieldset className="passenger-fields" key={seatNumber}>
          <legend>{seatNumber}-o'rindiq · Yo'lovchi {index + 1}</legend>
          <label className="field"><span>Ism-familiya</span><input required minLength={3} value={passengerInfo[seatNumber]?.fullName || ""} onChange={(event) => setPassengerInfo((info) => ({ ...info, [seatNumber]: { ...info[seatNumber], fullName: event.target.value } }))} /></label>
          <label className="field"><span>Telefon</span><input required type="tel" placeholder="+998 90 123 45 67" value={passengerInfo[seatNumber]?.phone || ""} onChange={(event) => setPassengerInfo((info) => ({ ...info, [seatNumber]: { ...info[seatNumber], phone: event.target.value } }))} /></label>
          <label className="field"><span>Jinsi</span><select value={passengerInfo[seatNumber]?.gender || "male"} onChange={(event) => setPassengerInfo((info) => ({ ...info, [seatNumber]: { ...info[seatNumber], gender: event.target.value } }))}><option value="male">Erkak</option><option value="female">Ayol</option></select></label>
        </fieldset>)}
        {error && <div className="notice notice-error">{error}</div>}
        {selected.length > 0 && <div className="booking-summary"><span>{selected.length} ta joy · Jami</span><strong>{new Intl.NumberFormat("uz-UZ").format(selected.length * trip.price)} so'm</strong></div>}
        <button className="button button-orange" type="submit" disabled={!selected.length}>Bron qilish va davom etish</button>
      </form>
    </section>
  );
}
