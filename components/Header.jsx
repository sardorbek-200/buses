"use client";

import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="header">
      <div className="container header-inner">
        <a className="brand" href="/">Bus<span>Ticket</span></a>
        <button className="menu-toggle" type="button" aria-label="Menyuni ochish" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <nav className={menuOpen ? "nav nav-open" : "nav"}>
          <a href="/search">Reyslar</a>
          <a href="/#routes">Yo'nalishlar</a>
          <a href="/#faq">Yordam</a>
          <a className="button button-outline nav-login" href="/login">Kirish</a>
        </nav>
      </div>
    </header>
  );
}
