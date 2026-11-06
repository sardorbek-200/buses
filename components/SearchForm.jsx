"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function CityInput({ label, value, onChange, placeholder }) {
  const [options, setOptions] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/cities?search=${encodeURIComponent(value)}`);
        const result = await response.json();
        if (result.success) setOptions(result.data);
      } catch {
        setOptions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <label className="field city-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setShowOptions(true)}
        onBlur={() => setTimeout(() => setShowOptions(false), 120)} placeholder={placeholder} autoComplete="off" required />
      {showOptions && options.length > 0 && <div className="suggestions">
        {options.map((city) => <button type="button" key={city.slug} onMouseDown={() => onChange(city.name)}>{city.name}<small>{city.region}</small></button>)}
      </div>}
    </label>
  );
}

export default function SearchForm({ initialFrom = "", initialTo = "", initialDate = localDate() }) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [passengers, setPassengers] = useState("1");
  function submit(event) {
    event.preventDefault();
    const query = new URLSearchParams({ from, to, date, passengers });
    router.push(`/search?${query}`);
  }
  return (
    <form className="search-form" onSubmit={submit}>
      <div className="city-pair">
        <CityInput label="Qayerdan" value={from} onChange={setFrom} placeholder="Shaharni tanlang" />
        <button className="swap-button" type="button" aria-label="Shaharlarni almashtirish" onClick={() => { setFrom(to); setTo(from); }}>↔</button>
        <CityInput label="Qayerga" value={to} onChange={setTo} placeholder="Manzilni tanlang" />
      </div>
      <label className="field date-field"><span>Jo'nash sanasi</span><input type="date" min={localDate()} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <label className="field passenger-field"><span>Yo'lovchilar</span><select value={passengers} onChange={(event) => setPassengers(event.target.value)}>{[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number} kishi</option>)}</select></label>
      <button className="button button-orange search-button" type="submit">Reyslarni qidirish <span aria-hidden="true">→</span></button>
      <div className="quick-dates"><span>Tez tanlash:</span><button type="button" onClick={() => setDate(localDate())}>Bugun</button><button type="button" onClick={() => setDate(localDate(1))}>Ertaga</button></div>
    </form>
  );
}
