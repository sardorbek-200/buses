"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function TicketQr({ value }) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: 180 }).then((result) => { if (active) setImage(result); });
    return () => { active = false; };
  }, [value]);
  return image ? <img className="ticket-qr" src={image} alt="Elektron chipta QR kodi" width="180" height="180" /> : <div className="skeleton qr-skeleton" />;
}
