import TripBooking from "@/components/TripBooking";

export const metadata = { title: "Reys va o'rindiq tanlash | BusTicket" };

export default async function TripPage({ params }) {
  const { id } = await params;
  return <TripBooking tripId={id} />;
}
