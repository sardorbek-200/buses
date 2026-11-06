import SearchForm from "@/components/SearchForm";

const routes = [
  { from: "Toshkent", to: "Samarqand", price: "75 000", time: "4 soat" },
  { from: "Toshkent", to: "Buxoro", price: "110 000", time: "7 soat" },
  { from: "Toshkent", to: "Farg'ona", price: "90 000", time: "5 soat" },
  { from: "Samarqand", to: "Buxoro", price: "65 000", time: "3 soat" },
  { from: "Toshkent", to: "Andijon", price: "100 000", time: "6 soat" },
  { from: "Toshkent", to: "Qarshi", price: "85 000", time: "5 soat" }
];

export default function HomePage() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="container hero-content">
          <div className="hero-copy"><span className="demo-pill">O'ZBEKISTON BO'YLAB SAFAR</span>
            <h1>Safaringiz<br />oson <span>boshlanadi.</span></h1>
            <p>Reysni toping, qulay joyni tanlang va elektron chiptangizni bir necha daqiqada oling.</p>
            <div className="hero-points"><span>✓ Ishonchli tashuvchilar</span><span>✓ Qulay joy tanlash</span><span>✓ QR chipta</span></div>
          </div>
          <div className="search-panel"><div className="search-panel-heading"><div><span className="eyebrow">KEYINGI MANZILINGIZ</span><h2>Qayerga borasiz?</h2></div><span className="search-icon">↗</span></div>
            <SearchForm initialDate={date} />
          </div>
        </div>
        <div className="hero-bottom container"><span>O'zbekiston bo'ylab qatnovlar</span><span className="hero-line" /><span>Safar · Qulaylik · Ishonch</span></div>
      </section>

      <section className="container assurance">
        <div><span className="assurance-icon">◈</span><strong>Onlayn bron</strong><small>O'rindiqni oldindan tanlang</small></div>
        <div><span className="assurance-icon">▣</span><strong>Elektron chipta</strong><small>QR-kod bilan qulay safar</small></div>
        <div><span className="assurance-icon">↺</span><strong>Shaffof qoidalar</strong><small>Qaytarish shartlari oldindan</small></div>
        <div><span className="assurance-icon">◉</span><strong>Haqiqiy vaqt</strong><small>Bo'sh joylar yangilanadi</small></div>
      </section>

      <section className="section section-muted" id="routes">
        <div className="container"><div className="section-heading"><div><p className="eyebrow">SAYOHATINGIZNI BOSHLANG</p><h2>Ommabop yo'nalishlar</h2><p>Ko'p tanlanadigan yo'nalishlardan birini ko'rib chiqing.</p></div><a className="text-link" href="/search">Barcha reyslar <span>→</span></a></div>
          <div className="route-grid">{routes.map((route) => <a className="route-card" href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${date}&passengers=1`} key={`${route.from}-${route.to}`}>
            <div className="route-art"><span className="route-art-mark">BT</span><span className="route-route-line" /><span className="route-city-code">{route.to.slice(0, 3).toUpperCase()}</span></div>
            <div className="route-card-body"><h3>{route.from} <span>→</span> {route.to}</h3><div><span>⏱ {route.time}</span><strong>{route.price} so'mdan</strong></div></div>
          </a>)}</div>
        </div>
      </section>

      <section className="section"><div className="container">
        <div className="section-heading centered"><div><p className="eyebrow">UCHTA OSON QADAM</p><h2>Chipta olish juda oson</h2><p>Safaringizni rejalashdan elektron chiptani olishgacha — hammasi bir joyda.</p></div></div>
        <div className="steps-grid">{[
          ["01", "Reysni toping", "Manzil va sanani tanlab, sizga mos qatnovlarni solishtiring."],
          ["02", "Joyni tanlang", "Avtobus sxemasidan o'zingizga qulay o'rindiqni belgilang."],
          ["03", "To'lov qiling", "Buyurtmani tasdiqlab, to'lovni xavfsiz yakunlang."],
          ["04", "QR chipta oling", "Elektron chiptani yuklab oling va safarga chiqing."]
        ].map(([number, title, text]) => <article className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>

      <section className="section benefits-section"><div className="container benefits-wrap">
        <div><p className="eyebrow">BUS TICKET AFZALLIKLARI</p><h2>Safar rejangiz<br />o'z qo'lingizda.</h2><p className="muted">Kerakli ma'lumotlar, joy tanlash va elektron chipta — tushunarli va qulay jarayonda.</p><a className="button button-orange" href="/search">Reyslarni ko'rish <span>→</span></a></div>
        <div className="benefit-list">{[
          ["⌖", "Bo'sh joylarni ko'ring", "O'rindiqlar bandligining yangilangan holati."],
          ["▤", "Safar ma'lumotlari", "Jo'nash va yetib borish vaqtlarini oldindan biling."],
          ["◉", "QR bilan tekshiruv", "Chiptani telefoningizdan ko'rsating."],
          ["↻", "Qaytarish qoidalari", "Bekor qilish shartlari bron oldidan ko'rsatiladi."]
        ].map(([icon, title, text]) => <div className="benefit-item" key={title}><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div>
      </div></section>

      <section className="section"><div className="container faq-section" id="faq"><div><p className="eyebrow">YORDAM</p><h2>Ko'p so'raladigan savollar</h2><p className="muted">Safaringizdan oldin bilib oling.</p></div><div className="faq-list">
        <details><summary>Chiptani qanday olaman?<span>+</span></summary><p>Reysni tanlang, bo'sh o'rindiqni belgilang, yo'lovchi ma'lumotlarini kiriting va bronni to'lov bilan tasdiqlang. Elektron chipta profilingizda paydo bo'ladi.</p></details>
        <details><summary>Avtobusga qachon kelishim kerak?<span>+</span></summary><p>Jo'nashdan kamida 30 daqiqa oldin bekatda bo'lishni tavsiya qilamiz.</p></details>
        <details><summary>Chiptani qaytarish mumkinmi?<span>+</span></summary><p>Qaytariladigan summa jo'nashgacha qolgan vaqtga bog'liq. Bronni bekor qilish sahifasida hisoblangan summa ko'rsatiladi.</p></details>
        <details><summary>Chiptamni qanday ko'rsataman?<span>+</span></summary><p>Elektron chiptadagi QR-kodni telefoningizda ko'rsating yoki PDF nusxasini yuklab oling.</p></details>
      </div></div></section>
    </>
  );
}
