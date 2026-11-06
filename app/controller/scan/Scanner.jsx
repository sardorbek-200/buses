"use client";

import { useEffect, useRef, useState } from "react";

export default function Scanner() {
  const scanner = useRef(null);
  const [message, setMessage] = useState("");
  const [qr, setQr] = useState("");
  const [result, setResult] = useState(null);
  const [active, setActive] = useState(false);

  useEffect(() => () => { scanner.current?.stop().catch((error) => console.error("Could not stop QR scanner:", error)); }, []);

  async function verify(value) {
    setMessage("");
    const response = await fetch("/api/v1/tickets/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr: value })
    });
    const data = await response.json();
    setResult({ success: response.ok, message: data.success ? data.data.message : data.error?.message, detail: data.data });
  }

  async function startScanner() {
    setMessage("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode("qr-reader");
      scanner.current = instance;
      await instance.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, async (value) => {
        await instance.stop();
        setActive(false);
        await verify(value);
      }, () => {});
      setActive(true);
    } catch (error) {
      setMessage(error.message || "Kamerani ishga tushirib bo'lmadi. Kamera ruxsatini tekshiring.");
    }
  }

  return <section className="container scanner-page"><p className="eyebrow">NAZORATCHI PANELI</p><h1>Chipta tekshirish</h1>
    <p className="muted">Yo'lovchining QR-kodini kamerada skanerlang yoki kodni qo'lda kiriting.</p>
    <div className="scanner-card"><div id="qr-reader" className="qr-reader" />
      <button className="button button-orange" type="button" onClick={startScanner} disabled={active}>{active ? "Kamera faol" : "Kamerani yoqish"}</button>
      <form className="manual-qr" onSubmit={(event) => { event.preventDefault(); verify(qr); }}><label className="field"><span>QR kod matni</span><input value={qr} onChange={(event) => setQr(event.target.value)} placeholder="chipta-id.imzo" /></label><button className="button button-outline" disabled={!qr}>Tekshirish</button></form>
      {message && <div className="notice notice-error">{message}</div>}
      {result && <div className={result.success ? "notice notice-success" : "notice notice-error"}><strong>{result.message}</strong>{result.detail?.passenger && <p>{result.detail.passenger} · O'rindiq {result.detail.seatNumber}</p>}</div>}
    </div>
  </section>;
}
