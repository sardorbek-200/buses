"use client";

import { useEffect, useState } from "react";

function formatTime(value) {
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" }).format(new Date(value));
}

function formatPrice(value) {
  return new Intl.NumberFormat("uz-UZ").format(value) + " so'm";
}

export default function SearchResults({ params }) {
  const [result, setResult] = useState({ loading: true, trips: [], error: "" });
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(params);
    fetch(`/api/v1/trips/search?${query}`).then((response) => response.json()).then((data) => {
      if (active) setResult({ loading: false, trips: data.success ? data.data : [], error: data.success ? "" : data.error.message });
    }).catch(() => {
      if (active) setResult({ loading: false, trips: [], error: "Reyslarni yuklab bo'lmadi. Keyinroq qayta urinib ko'ring." });
    });
    return () => { active = false; };
  }, [params]);

  return (
    <section className="container results-section">
      <div className="results-heading"><div><p className="eyebrow">SIZNING SAFARINGIZ</p><h1>{params.from} <span>→</span> {params.to}</h1><p>{params.date} · {params.passengers} yo'lovchi</p></div><a className="button button-outline" href="/">Qidiruvni o'zgartirish</a></div>
      {result.loading && <div className="trip-list">{[1, 2, 3].map((item) => <div className="skeleton trip-skeleton" key={item} />)}</div>}
      {!result.loading && result.error && <div className="notice notice-error">{result.error}</div>}
      {!result.loading && !result.error && result.trips.length === 0 && <div className="empty-state"><div>🚌</div><h2>Bu sanaga reys topilmadi</h2><p>Boshqa sana yoki yo'nalishni tanlab ko'ring.</p><a className="button button-orange" href="/">Yangi qidiruv</a></div>}
      {!result.loading && result.trips.length > 0 && <div className="trip-list">{result.trips.map((trip) => (
        <article className="trip-card" key={trip.id}>
          <div className="trip-times"><div><strong>{formatTime(trip.departAt)}</strong><span>{trip.from}</span></div><div className="trip-duration"><i />{Math.floor(trip.durationMinutes / 60)} soat {trip.durationMinutes % 60} daq.<i /></div><div><strong>{formatTime(trip.arriveAt)}</strong><span>{trip.to}</span></div></div>
          <div className="trip-operator"><span className="bus-icon">▰</span><div><strong>{trip.operator}</strong><span>{trip.busModel} · {trip.busType}</span></div></div>
          <div className="trip-price"><strong>{formatPrice(trip.price)}</strong><span>{trip.availableSeats} ta bo'sh joy</span></div>
          <a className={`button ${trip.unavailable ? "button-disabled" : "button-orange"}`} href={trip.unavailable ? undefined : `/trips/${trip.id}`}>{trip.unavailable ? "Joy qolmagan" : "Joy tanlash"}</a>
        </article>
      ))}</div>}
    </section>
  );
}
