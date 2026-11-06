import SearchResults from "@/components/SearchResults";

export const metadata = { title: "Avtobus reyslarini qidirish | BusTicket" };

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = {
    from: String(params.from || ""),
    to: String(params.to || ""),
    date: String(params.date || ""),
    passengers: String(params.passengers || "1")
  };
  return <SearchResults params={query} />;
}
