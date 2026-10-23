import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "./welcome/page";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/workspace");
  const cookieStore = await cookies();
  if (cookieStore.get("akiba_returning")?.value === "1") redirect("/login");
  return <LandingPage />;
}
