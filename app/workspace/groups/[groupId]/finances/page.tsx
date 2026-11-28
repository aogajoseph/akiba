import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import FinancePanel from "./finance-panel";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

type Props = { params: Promise<{ groupId: string }> };
type PostedContribution = {
  id: string;
  reference: string;
  description: string;
  currency_code: string;
  effective_at: string;
  amount_minor: number;
};

function initials(value: string) {
  return value.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}
function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return currency + " " + (minor / 100).toLocaleString("en");
  }
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function GroupFinancesPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,currency_code,target_amount,group_image_path,group_plan_code,status,scheduled_delete_at,created_by").eq("id", groupId).maybeSingle(),
    supabase.from("akiba_profiles").select("username,display_name,avatar_path").eq("user_id", user.id).maybeSingle(),
  ]);
  if (groupError || !group) notFound();
  if (!profile?.display_name?.trim()) redirect("/onboarding");

  const [{ data: membership }, { data: leadershipMembers }, { data: groupPlan }] = await Promise.all([
    supabase.from("akiba_group_memberships").select("status,role").eq("group_id", group.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("akiba_group_memberships").select("role").eq("group_id", group.id).eq("status", "active"),
    supabase.from("akiba_group_plan_entitlements").select("required_group_admins").eq("plan_code", group.group_plan_code).maybeSingle(),
  ]);
  if (!membership || membership.status !== "active") notFound();
  const isCreator = group.created_by === user.id && membership.role === "group_creator";
  const activeGroupAdminCount = (leadershipMembers ?? []).filter((member) => member.role === "group_admin").length;
  const requiredGroupAdmins = groupPlan?.required_group_admins ?? 3;
  const leadershipReady = activeGroupAdminCount >= requiredGroupAdmins;

  const [{ data: transactions, error: transactionError, count: transactionCount }, { data: ledgerLines, error: ledgerError }] = await Promise.all([
    supabase.from("akiba_financial_transactions")
      .select("id,reference,description,currency_code,effective_at", { count: "exact" })
      .eq("group_id", group.id)
      .eq("transaction_type", "contribution")
      .order("effective_at", { ascending: false }),
    supabase.from("akiba_financial_ledger_entries")
      .select("transaction_id,amount_minor")
      .eq("group_id", group.id)
      .eq("account_code", "group_funds")
      .eq("direction", "credit"),
  ]);

  const linesByTransaction = new Map<string, number>();
  for (const line of ledgerLines ?? []) {
    linesByTransaction.set(line.transaction_id, (linesByTransaction.get(line.transaction_id) ?? 0) + Number(line.amount_minor));
  }
  const history: PostedContribution[] = (transactions ?? [])
    .filter((transaction) => linesByTransaction.has(transaction.id))
    .map((transaction) => ({
      ...transaction,
      amount_minor: linesByTransaction.get(transaction.id) ?? 0,
    }));
  const totalMinor = history.reduce((sum, item) => sum + item.amount_minor, 0);
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const sandboxEnabled = process.env.MPESA_ENVIRONMENT === "sandbox" &&
    process.env.MPESA_SANDBOX_COLLECTION_ENABLED === "true" &&
    group.currency_code === "KES";
  const readError = Boolean(transactionError || ledgerError);

  return (
    <main className="ak-dashboard ak-workspace-app">
      <NotificationRealtime />

      <section className="ak-main">
        <header className="ak-topbar">
          <div className="ak-mobile-brand"><img src="/akiba-logo.png" alt="" />Akiba</div>
          <div className="ak-workspace-top-crumb"><Link href="/workspace/groups">My Groups</Link><span>/</span><Link href={`/workspace/groups/${group.id}`}>{group.name}</Link><span>/</span><strong>Finances</strong></div>
          <div className="ak-topbar-right"><NotificationBell /><MessageBell /><div className="ak-topbar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials(profile.display_name)}</div></div>
        </header>

        <div className="ak-dashboard-content ak-workspace-content">
          <section className="ak-finance-heading">
            <div>
              <Link className="ak-workspace-back" href={`/workspace/groups/${group.id}`}>← Back to {group.name}</Link>
              <span className="ak-section-eyebrow">GROUP WORKSPACE</span>
              <h1>Group finances</h1>
              <p>Track confirmed contributions and make a contribution to this group.</p>
            </div>
            <span className="ak-finance-currency">{group.currency_code}</span>
          </section>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link href={`/workspace/groups/${group.id}`}><DashboardOutlinedIcon />Overview</Link>
            <Link className="active" aria-current="page" href={`/workspace/groups/${group.id}/finances`}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link href={`/workspace/groups/${group.id}/membership`}><GroupsOutlinedIcon />Membership</Link>
            <Link className="" href={`/workspace/groups/${group.id}/chat`}><ChatBubbleOutlineOutlinedIcon />Chat</Link>
            {isCreator ?             <Link href={`/workspace/groups/${group.id}/settings`}><SettingsOutlinedIcon />Settings</Link> :             <span aria-disabled="true" title="Only the Group Creator can access group settings"><SettingsOutlinedIcon />Settings</span>}
          </nav>

          {group.status !== "active" && <div className="ak-workspace-card ak-group-deactivated-banner">
            <strong>This group has been deactivated.</strong>
            <p>New contributions and withdrawals are disabled. Historical financial records remain available during the retention period.</p>
            {group.scheduled_delete_at && <small>Scheduled deletion: {formatDate(group.scheduled_delete_at)}</small>}
          </div>}

          <section className="ak-finance-summary" aria-label="Group finance summary">
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon target">◎</span><div><small>Confirmed contributions</small><strong>{readError ? "—" : money(totalMinor, group.currency_code)}</strong><span>Only provider-confirmed funds are counted</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon members">↗</span><div><small>Posted contributions</small><strong>{readError ? "—" : transactionCount ?? 0}</strong><span>Immutable ledger transactions</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon role">◎</span><div><small>Group target</small><strong>{group.target_amount === null ? "Not set" : money(Number(group.target_amount) * 100, group.currency_code)}</strong><span>Shared group goal</span></div></article>
          </section>

          <div className="ak-finance-grid">
            <FinancePanel groupId={group.id} currencyCode={group.currency_code} enabled={sandboxEnabled && group.status === "active"} groupActive={group.status === "active"} leadershipReady={leadershipReady} requiredGroupAdmins={requiredGroupAdmins} />
            <section className="ak-workspace-card ak-finance-history">
              <div className="ak-workspace-card-heading">
                <div><span className="ak-section-eyebrow">CONFIRMED ACTIVITY</span><h2>Contribution history</h2><p>Entries appear only after the provider confirms payment and the ledger posts successfully.</p></div>
                <span className="ak-count-pill">{readError ? "Unavailable" : history.length + " posted"}</span>
              </div>
              {readError ? (
                <div className="ak-workspace-empty"><strong>Contribution history couldn’t be loaded</strong><p>Refresh the page to try again. No balances have been estimated.</p></div>
              ) : history.length === 0 ? (
                <div className="ak-workspace-empty"><strong>No confirmed contributions yet</strong><p>When a contribution is confirmed and posted, it will appear here.</p></div>
              ) : (
                <div className="ak-finance-history-list">
                  {history.map((item) => (
                    <article className="ak-finance-history-row" key={item.id}>
                      <span className="ak-finance-history-icon">✓</span>
                      <div><strong>{item.description || "Group contribution"}</strong><small>{formatDate(item.effective_at)} · Ref {item.reference}</small></div>
                      <strong>{money(item.amount_minor, item.currency_code)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
          <p className="ak-finance-disclaimer">Akiba does not hold or store group funds or M-Pesa PINs. Payments are processed by the payment provider. Pending, failed, cancelled or unverified payments are not included in the confirmed total.</p>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
