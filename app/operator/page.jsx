"use client";

import { useEffect, useState } from "react";

export default function OperatorPage() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/v1/operator/trips").then((response) => response.json()).then((result) => {
      if (!result.success) throw new Error(result.error?.message || "Reyslarni yuklab bo'lmadi");
      setTrips(result.data);
    }).catch((failure) => setError(failure.message));
  }, []);
  return <section className="container account-page"><p className="eyebrow">TASHUVCHI KOMPANIYA</p><h1>Operator paneli</h1>
    <div className="operator-actions"><a className="button button-outline" href="/dashboard">Kabinet</a><a className="button button-orange" href="/api/v1/operator/trips">Reys API</a></div>
    <p className="muted">Avtobus, marshrut va reyslar API orqali boshqariladi. Yaratishda operator akkaunti va unga biriktirilgan operator profili talab qilinadi.</p>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>Yo'nalish</th><th>Avtobus</th><th>Jo'nash (Toshkent)</th><th>Narx</th><th>Holat</th><th></th></tr></thead><tbody>
      {trips.map((trip) => <tr key={trip._id}><td>{trip.routeId?.fromCityId?.name} → {trip.routeId?.toCityId?.name}</td><td>{trip.busId?.model} · {trip.busId?.plateNumber}</td><td>{new Date(trip.departAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}</td><td>{new Intl.NumberFormat("uz-UZ").format(trip.price)} so'm</td><td>{trip.status}</td><td>{trip.status !== "cancelled" && <button className="text-button" onClick={async () => {
        const response = await fetch(`/api/v1/operator/trips/${trip._id}/cancel`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) setError(result.error?.message || "Bekor qilish amalga oshmadi");
        else setTrips((items) => items.map((item) => item._id === trip._id ? { ...item, status: "cancelled" } : item));
      }}>Bekor qilish</button>}</td></tr>)}
      {!trips.length && !error && <tr><td colSpan="6">Hozircha reyslar mavjud emas.</td></tr>}
    </tbody></table></div>
  </section>;
}
