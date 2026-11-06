import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "BusTicket — avtobus chiptalarini onlayn xarid qiling",
  description: "O'zbekiston bo'ylab shaharlararo avtobus reyslarini toping, o'rindiq tanlang va elektron chiptani onlayn oling.",
  openGraph: {
    title: "BusTicket — safaringiz oson boshlanadi",
    description: "Avtobus reyslari, joy tanlash va elektron chipta — barchasi bir joyda.",
    type: "website",
    locale: "uz_UZ"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <a className="brand footer-brand" href="/">Bus<span>Ticket</span></a>
            <p>O'zbekiston bo'ylab safaringizni oson rejalashtiring.</p>
            <div className="footer-links"><a href="/search">Reyslar</a><a href="/login">Yordam</a><a href="/login">Kirish</a></div>
            <small>© {new Date().getFullYear()} BusTicket. O'quv loyihasi.</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
