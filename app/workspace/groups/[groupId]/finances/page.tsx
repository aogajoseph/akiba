import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import NotificationRealtime from "@/app/workspace/notification-realtime";
import NotificationBell from "@/app/workspace/notification-bell";
import MessageBell from "@/app/workspace/message-bell";
import NotificationSidebarLink from "@/app/workspace/notification-sidebar-link";
import MessagesSidebarLink from "@/app/workspace/messages-sidebar-link";
import FinancePanel from "./finance-panel";
import WithdrawalPanel from "./withdrawal-panel";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
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

export default async function GroupFinancesPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const query = searchParams ? await searchParams : {};
  const financeError = typeof query.financeError === "string" ? query.financeError : "";
  const financeUpdated = typeof query.financeUpdated === "string" ? query.financeUpdated : "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group, error: groupError }, { data: profile }] = await Promise.all([
    supabase.from("akiba_groups").select("id,name,currency_code,target_amount,group_image_path,group_plan_code,status,scheduled_delete_at").eq("id", groupId).maybeSingle(),
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
  const activeGroupAdminCount = (leadershipMembers ?? []).filter((member) => member.role === "group_admin").length;
  const activeGroupCreatorCount = (leadershipMembers ?? []).filter((member) => member.role === "group_creator").length;
  const requiredGroupAdmins = Math.max(3, groupPlan?.required_group_admins ?? 3);
  const leadershipReady = activeGroupCreatorCount === 1 && activeGroupAdminCount >= requiredGroupAdmins;

  const [
    { data: transactions, error: transactionError, count: transactionCount },
    { data: ledgerLines, error: ledgerError },
    { data: balanceLines, error: balanceError },
    { data: withdrawalTransactions, error: withdrawalTransactionError },
    { data: allTransactions, error: allTransactionError },
    { data: withdrawalRequests, error: withdrawalRequestError },
    { data: withdrawalApprovals, error: withdrawalApprovalError },
    { data: approvalRoster, error: approvalRosterError },
    { data: withdrawalFlags, error: withdrawalFlagError },
    { data: reservations, error: reservationError },
    { data: financeEvents, error: financeEventError },
  ] = await Promise.all([
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
    supabase.from("akiba_financial_ledger_entries")
      .select("transaction_id,amount_minor,direction")
      .eq("group_id", group.id)
      .eq("account_code", "group_funds"),
    supabase.from("akiba_financial_transactions")
      .select("id,reference,description,currency_code,effective_at,created_by,transaction_type")
      .eq("group_id", group.id)
      .eq("transaction_type", "withdrawal")
      .order("effective_at", { ascending: false }),
    supabase.from("akiba_financial_transactions")
      .select("id,reference,description,currency_code,effective_at,created_by,transaction_type")
      .eq("group_id", group.id)
      .order("effective_at", { ascending: true }),
    supabase.from("akiba_withdrawal_requests")
      .select("id,group_id,initiator_id,currency_code,recipient_amount_minor,total_debit_minor,recipient_name,reason,status,created_at,staging_started_at,staging_deadline_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("akiba_withdrawal_approvals")
      .select("withdrawal_request_id,approver_id,decision")
      .eq("group_id", group.id),
    supabase.from("akiba_withdrawal_approval_roster")
      .select("withdrawal_request_id,admin_user_id")
      .eq("group_id", group.id),
    supabase.from("akiba_withdrawal_flags")
      .select("id,withdrawal_request_id,member_id,reason,status,created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false }),
    supabase.from("akiba_financial_reservations")
      .select("withdrawal_request_id,amount_minor,status")
      .eq("group_id", group.id)
      .eq("status", "active"),
    supabase.from("akiba_finance_activity_events")
      .select("id,event_type,actor_id,source_type,source_id,event_payload,created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(30),
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
  const withdrawalIds = new Set((withdrawalTransactions ?? []).map((item) => item.id));
  const completedWithdrawalMinor = (balanceLines ?? [])
    .filter((line) => withdrawalIds.has(line.transaction_id) && line.direction === "debit")
    .reduce((sum, line) => sum + Number(line.amount_minor), 0);
  const groupLedgerBalanceMinor = (balanceLines ?? []).reduce((sum, line) =>
    sum + (line.direction === "credit" ? Number(line.amount_minor) : -Number(line.amount_minor)), 0);
  const activeReservationMinor = (reservations ?? [])
    .reduce((sum, item) => sum + Number(item.amount_minor), 0);
  const stagedRequestIds = new Set((withdrawalRequests ?? [])
    .filter((item) => ["staging", "payout_queued", "payout_submitted", "payout_processing", "reconciliation_required"].includes(item.status))
    .map((item) => item.id));
  const stagedFundsMinor = (reservations ?? [])
    .filter((item) => stagedRequestIds.has(item.withdrawal_request_id))
    .reduce((sum, item) => sum + Number(item.amount_minor), 0);
  const requestStatusById = new Map((withdrawalRequests ?? []).map((item) => [item.id, item.status]));
  const pendingApprovals = (approvalRoster ?? []).filter((item) =>
    requestStatusById.get(item.withdrawal_request_id) === "pending_approval" &&
    !(withdrawalApprovals ?? []).some((approval) =>
      approval.withdrawal_request_id === item.withdrawal_request_id &&
      approval.approver_id === item.admin_user_id
    )
  ).length;
  const availableBalanceMinor = groupLedgerBalanceMinor - activeReservationMinor;
  const targetMinor = group.target_amount === null ? 0 : Number(group.target_amount) * 100;
  const progressPercent = targetMinor > 0 ? Math.round((Math.max(0, availableBalanceMinor) / targetMinor) * 100) : 0;
  const progressWidth = Math.max(0, Math.min(100, progressPercent));
  const withdrawalReadError = Boolean(
    balanceError || withdrawalTransactionError || allTransactionError || withdrawalRequestError ||
    withdrawalApprovalError || approvalRosterError || withdrawalFlagError ||
    reservationError || financeEventError
  );
  const statementActorIds = Array.from(new Set([
    ...(allTransactions ?? []).map((item) => item.created_by),
    ...(financeEvents ?? []).map((event) => event.actor_id),
  ].filter((id): id is string => typeof id === "string")));
  let statementProfiles: Array<{ user_id: string; display_name: string | null }> = [];
  if (statementActorIds.length > 0) {
    const { data } = await supabase.from("akiba_profiles")
      .select("user_id,display_name")
      .in("user_id", statementActorIds);
    statementProfiles = data ?? [];
  }
  const actorNameById = new Map(statementProfiles.map((profile) => [
    profile.user_id,
    profile.display_name?.trim() || "Group member",
  ]));

  const ledgerStatementRows = (allTransactions ?? []).map((item) => {
    const deltaMinor = (balanceLines ?? [])
      .filter((line) => line.transaction_id === item.id)
      .reduce((sum, line) => sum + (line.direction === "credit"
        ? Number(line.amount_minor)
        : -Number(line.amount_minor)), 0);
    const amountMinor = Math.abs(deltaMinor);
    return {
      id: "ledger:" + item.id,
      transactionId: item.id,
      occurredAt: item.effective_at,
      description: item.description || String(item.transaction_type).replace(/_/g, " "),
      reference: item.reference,
      amountMinor,
      kind: "Ledger posting",
      currency: item.currency_code,
      actorName: item.created_by ? actorNameById.get(item.created_by) ?? "Group member" : "Akiba system",
      balanceImpact: deltaMinor === 0
        ? "No group-funds movement"
        : "Group funds " + (deltaMinor > 0 ? "+" : "−") + money(amountMinor, item.currency_code),
    };
  });
  const workflowStatementRows = (financeEvents ?? []).map((event) => {
    const payload = event.event_payload && typeof event.event_payload === "object" && !Array.isArray(event.event_payload)
      ? event.event_payload as Record<string, unknown>
      : {};
    const rawAmount = payload.amount_minor ?? payload.total_debit_minor ?? payload.recipient_amount_minor;
    const parsedAmount = rawAmount === undefined || rawAmount === null ? null : Number(rawAmount);
    return {
      id: "event:" + event.id,
      transactionId: event.source_id,
      occurredAt: event.created_at,
      description: String(event.event_type).replace(/_/g, " "),
      reference: event.source_type.replace(/_/g, " "),
      amountMinor: parsedAmount !== null && Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null,
      kind: "Workflow event · no ledger posting",
      currency: payload.currency_code ? String(payload.currency_code) : group.currency_code,
      actorName: event.actor_id ? actorNameById.get(event.actor_id) ?? "Group member" : "Akiba system",
      balanceImpact: "No ledger movement",
    };
  });
  const statementRows = [...ledgerStatementRows, ...workflowStatementRows]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 50);
  let payoutEnabled = false;
  try {
    const service = createServiceClient();
    const { data: payoutProvider } = await service.from("akiba_payment_providers")
      .select("is_enabled,capabilities")
      .eq("provider_code", "safaricom_daraja")
      .maybeSingle();
    const payoutCapabilities =
      payoutProvider?.capabilities &&
      typeof payoutProvider.capabilities === "object" &&
      !Array.isArray(payoutProvider.capabilities)
        ? payoutProvider.capabilities as Record<string, unknown>
        : {};
    payoutEnabled = Boolean(
      payoutProvider?.is_enabled &&
      payoutCapabilities.payout === true &&
      payoutCapabilities.fee_quotes === true &&
      payoutCapabilities.environment === "sandbox"
    );
  } catch {
    // Fail closed: the Creator's withdrawal CTA remains disabled if provider
    // payout capability cannot be verified from the trusted server client.
    payoutEnabled = false;
  }
  const avatarUrl = profile.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
  const sandboxEnabled = process.env.MPESA_ENVIRONMENT === "sandbox" &&
    process.env.MPESA_SANDBOX_COLLECTION_ENABLED === "true" &&
    group.currency_code === "KES";
  const readError = Boolean(transactionError || ledgerError);

  return (
    <main className="ak-dashboard ak-workspace-app">
      <NotificationRealtime />
      <aside className="ak-sidebar">
        <Link href="/workspace" className="ak-brand"><img src="/akiba-logo.png" alt="" /><span>Akiba</span></Link>
        <nav className="ak-nav" aria-label="Main navigation">
          <span className="ak-nav-label">WORKSPACE</span>
          <Link href="/workspace" className="ak-nav-link"><span>⌂</span>Home</Link>
          <Link href="/workspace/groups" className="ak-nav-link active"><span>♧</span>My Groups</Link>
          <Link href="/workspace/invitations" className="ak-nav-link"><span>✉</span>Invitations</Link>
          <NotificationSidebarLink />
          <MessagesSidebarLink />
          <span className="ak-nav-label ak-nav-label-spaced">ACCOUNT</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>♙</span>My Profile</span>
          <span className="ak-nav-link ak-nav-muted" aria-disabled="true"><span>⚙</span>Settings</span>
        </nav>
        <div className="ak-sidebar-bottom">
          <div className="ak-sidebar-promo"><span className="ak-promo-mark">✳</span><strong>Do more, together</strong><p>Bring people together around the things that matter.</p><Link href="/workspace/new">Create a group <span>→</span></Link></div>
          <div className="ak-sidebar-user">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="ak-avatar-fallback">{initials(profile.display_name)}</span>}
            <span className="ak-sidebar-user-copy"><strong>{profile.display_name}</strong><small>@{profile.username}</small></span>
            <form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out">↗</button></form>
          </div>
        </div>
      </aside>

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
              <p>Track contributions, withdrawals, reservations and the financial activity of this group.</p>
            </div>
            <span className="ak-finance-currency">{group.currency_code}</span>
          </section>

          <nav className="ak-group-tabs" aria-label="Group workspace">
            <Link href={`/workspace/groups/${group.id}`}><DashboardOutlinedIcon />Overview</Link>
            <Link className="active" aria-current="page" href={`/workspace/groups/${group.id}/finances`}><AccountBalanceWalletOutlinedIcon />Finances</Link>
            <Link href={`/workspace/groups/${group.id}/membership`}><GroupsOutlinedIcon />Membership</Link>
            <Link className="" href={`/workspace/groups/${group.id}/chat`}><ChatBubbleOutlineOutlinedIcon />Chat</Link>
            <span aria-disabled="true" title="Group settings are coming soon"><SettingsOutlinedIcon />Settings</span>
          </nav>

          {group.status !== "active" && <div className="ak-workspace-card ak-group-deactivated-banner">
            <strong>This group has been deactivated.</strong>
            <p>New contributions and withdrawals are disabled. Historical financial records remain available during the retention period.</p>
            {group.scheduled_delete_at && <small>Scheduled deletion: {formatDate(group.scheduled_delete_at)}</small>}
          </div>}

          {financeError && <div className="ak-finance-alert ak-finance-alert-error" role="alert">{financeError}</div>}
          {financeUpdated && <div className="ak-finance-alert ak-finance-alert-success" role="status">{financeUpdated}</div>}

          <section className="ak-finance-summary" aria-label="Group finance summary">
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon target">◎</span><div><small>Total contributions</small><strong>{readError ? "—" : money(totalMinor, group.currency_code)}</strong><span>Confirmed and posted since group creation</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon role">↘</span><div><small>Completed withdrawals</small><strong>{withdrawalReadError ? "—" : money(completedWithdrawalMinor, group.currency_code)}</strong><span>Provider-confirmed and posted</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon members">◷</span><div><small>Staged funds</small><strong>{withdrawalReadError ? "—" : money(stagedFundsMinor, group.currency_code)}</strong><span>Reserved after final Admin approval</span></div></article>
            <article className="ak-workspace-summary-card"><span className="ak-summary-icon target">✓</span><div><small>Pending Admin approvals</small><strong>{withdrawalReadError ? "—" : pendingApprovals}</strong><span>Decisions still required</span></div></article>
          </section>

          <section className="ak-workspace-card ak-finance-progress">
            <div className="ak-workspace-card-heading">
              <div><span className="ak-section-eyebrow">GROUP TARGET</span><h2>Funding progress</h2></div>
              <strong>{withdrawalReadError ? "—" : targetMinor > 0 ? progressPercent + "%" : "No target set"}</strong>
            </div>
            <div className="ak-finance-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={withdrawalReadError ? 0 : progressWidth} aria-valuetext={withdrawalReadError ? "Unavailable" : targetMinor > 0 ? progressPercent + "% of target" : "No target set"}>
              <span style={{ width: (withdrawalReadError ? 0 : progressWidth) + "%" }} />
            </div>
            <div className="ak-finance-progress-meta">
              <strong>{withdrawalReadError ? "—" : money(availableBalanceMinor, group.currency_code)} available</strong>
              <span>{targetMinor > 0 ? "Target " + money(targetMinor, group.currency_code) : "Set a group target to track progress"}</span>
            </div>
            {withdrawalReadError && <small>Progress is unavailable because the financial balance could not be verified.</small>}
            {!withdrawalReadError && progressPercent > 100 && <small>The group has exceeded its target. The progress indicator is capped at 100%.</small>}
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

          <WithdrawalPanel
            groupId={group.id}
            currentUserId={user.id}
            currentUserRole={membership.role}
            payoutEnabled={payoutEnabled}
            readError={withdrawalReadError}
            requests={withdrawalRequests ?? []}
            approvals={withdrawalApprovals ?? []}
            roster={approvalRoster ?? []}
            flags={withdrawalFlags ?? []}
          />

          <section className="ak-workspace-card ak-finance-history ak-finance-activity-statement">
            <div className="ak-workspace-card-heading">
              <div><span className="ak-section-eyebrow">FINANCIAL RECORD</span><h2>Activity statement</h2><p>Money postings and workflow actions are shown separately; approvals and flags do not create ledger entries.</p></div>
              <span className="ak-count-pill">{withdrawalReadError ? "Unavailable" : statementRows.length + " entries"}</span>
            </div>
            {withdrawalReadError ? (
              <div className="ak-workspace-empty"><strong>Financial activity could not be loaded</strong><p>Refresh the page to try again.</p></div>
            ) : statementRows.length === 0 ? (
              <div className="ak-workspace-empty"><strong>No financial activity yet</strong><p>Contributions, withdrawals, approvals, flags and other financial actions will appear here.</p></div>
            ) : (
              <div className="ak-finance-history-list">
                {statementRows.map((item) => (
                  <article className="ak-finance-history-row" key={item.id}>
                    <span className="ak-finance-history-icon">{item.kind === "Ledger posting" ? "✓" : "•"}</span>
                    <div><strong>{item.description}</strong><small>{formatDate(item.occurredAt)} · {item.kind} · {item.reference} · ID {String(item.transactionId).slice(0, 8)} · {item.actorName}</small></div>
                    <strong>{item.amountMinor === null ? item.balanceImpact : item.balanceImpact}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="ak-finance-disclaimer">Akiba does not hold or store group funds or M-Pesa PINs. Payments are processed by the payment provider. Pending, failed, cancelled or unverified payments are not included in the confirmed total.</p>
          <footer className="ak-footer"><span>Akiba · A Globe Software product</span><span>Do more, together.</span></footer>
        </div>
      </section>
    </main>
  );
}
