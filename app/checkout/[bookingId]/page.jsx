import Checkout from "./Checkout";

export const metadata = { title: "To'lov va chipta | BusTicket" };

export default async function CheckoutPage({ params }) {
  const { bookingId } = await params;
  return <Checkout bookingId={bookingId} />;
}
