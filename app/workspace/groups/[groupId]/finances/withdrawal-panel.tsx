import {
  cancelWithdrawalRequest,
  createWithdrawalRequest,
  decideWithdrawalRequest,
  flagWithdrawal,
  removeWithdrawalFlag,
} from "@/app/workspace/actions";

type WithdrawalRequest = {
  id: string;
  group_id: string;
  initiator_id: string;
  currency_code: string;
  recipient_amount_minor: number;
  total_debit_minor: number;
  recipient_name: string;
  reason: string;
  status: string;
  created_at: string;
  staging_started_at: string | null;
  staging_deadline_at: string | null;
};

type Approval = {
  withdrawal_request_id: string;
  approver_id: string;
  decision: "approved" | "rejected";
};

type ApprovalRoster = {
  withdrawal_request_id: string;
  admin_user_id: string;
};

type WithdrawalFlag = {
  id: string;
  withdrawal_request_id: string;
  member_id: string;
  reason: string;
  status: "active" | "removed_by_member" | "closed_by_system";
  created_at: string;
};

type Props = {
  groupId: string;
  currentUserId: string;
  currentUserRole: string;
  leadershipReady: boolean;
  sandboxWorkflowEnabled: boolean;
  requestIdempotencyKey: string;
  readError: boolean;
  requests: WithdrawalRequest[];
  approvals: Approval[];
  roster: ApprovalRoster[];
  flags: WithdrawalFlag[];
};

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return currency + " " + (minor / 100).toLocaleString("en");
  }
}

function dateTime(value: string | null) {
  if (!value) return "Not started";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_approval: "Awaiting Admin approvals",
    approved: "Approved · staging transition pending",
    staging: "Two-hour member review",
    payout_queued: "Waiting for provider payout submission",
    payout_submitted: "Payout submitted",
    payout_processing: "Payout processing",
    reconciliation_required: "Provider reconciliation required",
    failed_pending_reconciliation: "Provider reconciliation required",
    rejected: "Rejected",
    cancelled: "Cancelled by Creator",
    cancelled_flagged: "Cancelled after member flag",
    completed: "Completed",
    failed: "Failed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export default function WithdrawalPanel({
  groupId,
  currentUserId,
  currentUserRole,
  leadershipReady,
  sandboxWorkflowEnabled,
  requestIdempotencyKey,
  readError,
  requests,
  approvals,
  roster,
  flags,
}: Props) {
  const isCreator = currentUserRole === "group_creator";
  const isAdmin = currentUserRole === "group_admin";
  const canRequest = isCreator && leadershipReady && sandboxWorkflowEnabled;

  return (
    <section className="ak-workspace-card ak-withdrawal-panel">
      <div className="ak-workspace-card-heading">
        <div>
          <span className="ak-section-eyebrow">GROUP WITHDRAWALS</span>
          <h2>Withdrawals and approvals</h2>
          <p>Only the Group Creator can request a withdrawal. Every Group Admin must approve it before the two-hour member review begins.</p>
        </div>
        {canRequest ? (
          <details className="ak-withdrawal-create">
            <summary className="ak-finance-primary-button">Request withdrawal</summary>
            <form action={createWithdrawalRequest} className="ak-finance-form ak-withdrawal-create-form">
              <input type="hidden" name="group_id" value={groupId} />
              <input type="hidden" name="idempotency_key" value={requestIdempotencyKey} />
              <label>
                Recipient amount (KES)
                <input name="amount_kes" type="number" inputMode="numeric" min="1" max="250000" step="1" defaultValue="1" required />
              </label>
              <label>
                Recipient name
                <input name="recipient_name" type="text" maxLength={160} autoComplete="off" required />
              </label>
              <label>
                Sandbox destination label
                <input name="destination_label" type="text" maxLength={48} placeholder="DEMO-RECIPIENT-01" autoComplete="off" required />
              </label>
              <label>
                Purpose of withdrawal
                <textarea name="reason" maxLength={500} rows={3} required />
              </label>
              <button type="submit" className="ak-finance-primary-button">Create sandbox request</button>
              <p className="ak-finance-helper">Sandbox workflow only. The destination is a non-routable test label, fees are simulated as KES 0, and no payment is sent. This creates the request and reservation for Admin approval.</p>
            </form>
          </details>
        ) : (
          <button type="button" className="ak-finance-secondary-button" disabled title={
            !isCreator
              ? "Only the Group Creator can request a withdrawal."
              : !leadershipReady
              ? "The group needs one active Creator and at least three active Group Admins."
              : "Sandbox withdrawal workflow simulation is unavailable."
          }>Withdraw</button>
        )}
      </div>

      {!isCreator && (
        <p className="ak-finance-disabled">Only the Group Creator can request a withdrawal. You can review requests and take actions permitted by your Group Admin or member role.</p>
      )}
      {isCreator && !leadershipReady && (
        <p className="ak-finance-disabled">Withdrawal requests are unavailable until the group has one active Group Creator and at least three active Group Admins.</p>
      )}
      {isCreator && leadershipReady && !sandboxWorkflowEnabled && (
        <p className="ak-finance-disabled">Sandbox withdrawal workflow simulation is unavailable. No live or real-money payout option is enabled.</p>
      )}
      {isCreator && leadershipReady && sandboxWorkflowEnabled && (
        <p className="ak-finance-disabled">This is a workflow demonstration only: the sandbox simulator creates no payment instruction, does not move funds, and cannot mark a withdrawal as paid. The zero-fee quote is synthetic, not a partner quote.</p>
      )}

      {readError ? (
        <div className="ak-workspace-empty"><strong>Withdrawal information could not be loaded</strong><p>Refresh the page to try again.</p></div>
      ) : requests.length === 0 ? (
        <div className="ak-workspace-empty">
          <strong>No withdrawal requests</strong>
          <p>When the Group Creator requests a withdrawal, its approvals, review period, flags and payout status will appear here.</p>
        </div>
      ) : (
        <div className="ak-withdrawal-list">
          {requests.map((request) => {
            const requestApprovals = approvals.filter((item) => item.withdrawal_request_id === request.id);
            const requestRoster = roster.filter((item) => item.withdrawal_request_id === request.id);
            const requestFlags = flags.filter((item) => item.withdrawal_request_id === request.id);
            const activeFlags = requestFlags.filter((item) => item.status === "active");
            const myApproval = requestApprovals.find((item) => item.approver_id === currentUserId);
            const myRosterEntry = requestRoster.some((item) => item.admin_user_id === currentUserId);
            const approvedCount = requestApprovals.filter((item) => item.decision === "approved").length;
            const rejectedCount = requestApprovals.filter((item) => item.decision === "rejected").length;
            const myActiveFlag = activeFlags.find((item) => item.member_id === currentUserId);
            const isInitiator = request.initiator_id === currentUserId;
            // The server RPC enforces the exact deadline. The UI follows the
            // persisted staging state; the minute worker closes expired periods.
            const canDecide = request.status === "pending_approval" && isAdmin && myRosterEntry && !myApproval;
            const canFlag = request.status === "staging" && Boolean(request.staging_deadline_at) && !myActiveFlag;
            const canRemoveFlag = request.status === "staging" && Boolean(request.staging_deadline_at) && Boolean(myActiveFlag);
            const canCancel = isCreator && isInitiator &&
              ["pending_approval", "staging", "payout_queued"].includes(request.status);

            return (
              <article className="ak-withdrawal-request" key={request.id}>
                <div className="ak-withdrawal-request-heading">
                  <div>
                    <strong>{money(Number(request.recipient_amount_minor), request.currency_code)} to {request.recipient_name}</strong>
                    <small>{dateTime(request.created_at)} · {request.reason}</small>
                  </div>
                  <span className="ak-count-pill">{statusLabel(request.status)}</span>
                </div>

                <div className="ak-withdrawal-metrics">
                  <span><small>Total group deduction</small><strong>{money(Number(request.total_debit_minor), request.currency_code)}</strong></span>
                  <span><small>Admin approvals</small><strong>{approvedCount}/{requestRoster.length || 0}</strong></span>
                  <span><small>Active flags</small><strong>{activeFlags.length}</strong></span>
                </div>

                {request.status === "pending_approval" && (
                  <div className="ak-withdrawal-actions">
                    {canDecide ? (
                      <>
                        <form action={decideWithdrawalRequest}>
                          <input type="hidden" name="group_id" value={groupId} />
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <button type="submit" className="ak-finance-primary-button">Approve withdrawal</button>
                        </form>
                        <form action={decideWithdrawalRequest} className="ak-withdrawal-reject-form">
                          <input type="hidden" name="group_id" value={groupId} />
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <label>
                            Reason for rejection
                            <input name="rejection_reason" maxLength={500} required placeholder="Explain why this should not proceed" />
                          </label>
                          <button type="submit" className="ak-finance-secondary-button">Reject</button>
                        </form>
                      </>
                    ) : (
                      <div className="ak-withdrawal-disabled-actions">
                        <button type="button" disabled title="Only an active Group Admin in the request-time approval roster can approve.">Approve</button>
                        <button type="button" disabled title="Only an active Group Admin in the request-time approval roster can reject.">Reject</button>
                        <small>
                          {myApproval
                            ? "Your decision has already been recorded."
                            : !isAdmin
                              ? "Only Group Admins can approve or reject."
                              : !myRosterEntry
                                ? "You were not in the Admin roster when this request was created."
                                : "No further decision is required from you."}
                        </small>
                      </div>
                    )}
                    {canCancel && (
                      <form action={cancelWithdrawalRequest}>
                        <input type="hidden" name="group_id" value={groupId} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <button type="submit" className="ak-finance-secondary-button">Cancel request</button>
                      </form>
                    )}
                    {rejectedCount > 0 && <small>At least one Admin has rejected this request. It is being resolved.</small>}
                  </div>
                )}

                {request.status === "staging" && (
                  <div className="ak-withdrawal-staging">
                    <p><strong>Member review ends:</strong> {dateTime(request.staging_deadline_at)}</p>
                    <p>{activeFlags.length > 0
                      ? "An active member flag is blocking payout. If it remains at the original deadline, the reservation will be released and the withdrawal cancelled."
                      : "Members can flag this withdrawal until the deadline. Removing a flag does not extend the review period."}</p>

                    {activeFlags.length > 0 && (
                      <ul className="ak-withdrawal-flags">
                        {activeFlags.map((flag) => (
                          <li key={flag.id}>
                            <span>{flag.reason}</span>
                            {flag.member_id === currentUserId && canRemoveFlag && (
                              <form action={removeWithdrawalFlag}>
                                <input type="hidden" name="group_id" value={groupId} />
                                <input type="hidden" name="flag_id" value={flag.id} />
                                <button type="submit" className="ak-finance-secondary-button">Remove my flag</button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {canFlag && (
                      <form action={flagWithdrawal} className="ak-withdrawal-flag-form">
                        <input type="hidden" name="group_id" value={groupId} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <label>
                          Flag this withdrawal
                          <input name="reason" maxLength={500} required placeholder="What should the group review?" />
                        </label>
                        <button type="submit" className="ak-finance-secondary-button">Flag withdrawal</button>
                      </form>
                    )}
                    {canCancel && (
                      <form action={cancelWithdrawalRequest}>
                        <input type="hidden" name="group_id" value={groupId} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <button type="submit" className="ak-finance-secondary-button">Cancel request</button>
                      </form>
                    )}
                    {requestFlags.some((flag) => flag.member_id === currentUserId && flag.status === "removed_by_member") && (
                      <small>Your previous flag was removed. You may flag again before the original deadline.</small>
                    )}
                  </div>
                )}

                {request.status === "payout_queued" && (
                  <div className="ak-withdrawal-staging">
                    <p>No active flags remained at the deadline. The withdrawal is queued for payout.</p>
                    <p>Funds remain reserved until the payment provider confirms payout completion. The current sandbox provider does not yet support payout execution.</p>
                    {canCancel && (
                      <form action={cancelWithdrawalRequest}>
                        <input type="hidden" name="group_id" value={groupId} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <button type="submit" className="ak-finance-secondary-button">Cancel before payout submission</button>
                      </form>
                    )}
                  </div>
                )}

                {["payout_submitted", "payout_processing", "reconciliation_required"].includes(request.status) && (
                  <p className="ak-finance-disabled">The payout has been submitted or has an uncertain provider outcome. Funds remain reserved until authoritative provider reconciliation.</p>
                )}

                {["rejected", "cancelled", "cancelled_flagged", "completed", "failed"].includes(request.status) && (
                  <p className="ak-withdrawal-terminal-note">
                    {request.status === "cancelled_flagged"
                      ? "The reservation was released because at least one flag remained active at the deadline."
                      : request.status === "completed"
                        ? "The provider confirmed payout completion and the withdrawal was posted to the ledger."
                        : request.status === "rejected"
                          ? "An Admin rejected the request. Its reservation was released."
                          : request.status === "failed"
                            ? "The provider confirmed that no payout occurred. Its reservation was released."
                            : "The Group Creator cancelled this request before payout submission. Its reservation was released."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
