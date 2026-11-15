import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "./welcome/page";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const invitationToken = user.user_metadata?.akiba_pending_invitation_token;
    if (typeof invitationToken === "string" && /^[0-9a-f]{64}$/.test(invitationToken)) {
      redirect("/invitations/" + invitationToken);
    }
    redirect("/workspace");
  }
  const cookieStore = await cookies();
  if (cookieStore.get("akiba_returning")?.value === "1") redirect("/login");
  return <LandingPage />;
}
