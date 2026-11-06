import LoginForm from "./LoginForm";

export const metadata = { title: "Kirish yoki ro'yxatdan o'tish | BusTicket" };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next : "/dashboard";
  return <LoginForm next={next} />;
}
