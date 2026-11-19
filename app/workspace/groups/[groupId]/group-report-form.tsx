"use client";

import { submitGroupReport } from "@/app/workspace/actions";

const reasons = [
  ["fraud_suspected_scam", "Fraud or suspected scam"],
  ["impersonation", "Impersonation"],
  ["harassment_abusive_behaviour", "Harassment or abusive behaviour"],
  ["inappropriate_content", "Inappropriate content"],
  ["misleading_group_information", "Misleading group information"],
  ["suspicious_financial_activity", "Suspicious financial activity"],
  ["other", "Other"],
] as const;

export default function GroupReportForm({
  groupId,
  errorMessage,
}: {
  groupId: string;
  errorMessage?: string;
}) {
  return (
    <form className="ak-group-report-form" action={submitGroupReport}>
      <input type="hidden" name="group_id" value={groupId} />
      {errorMessage && <p className="ak-group-report-error" role="alert">{errorMessage}</p>}
      <label htmlFor="group-report-reason">Select a reason</label>
      <select id="group-report-reason" name="reason" required defaultValue="">
        <option value="" disabled>Select a reason</option>
        {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>

      <label htmlFor="group-report-description">Additional information <span>(optional)</span></label>
      <textarea
        id="group-report-description"
        name="description"
        rows={5}
        maxLength={2000}
        placeholder="Tell us what happened or why this group concerns you."
      />

      <label htmlFor="group-report-evidence">Evidence attachments <span>(optional)</span></label>
      <input
        id="group-report-evidence"
        name="evidence"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
      />
      <p className="ak-group-report-hint">Up to 5 files · JPG, PNG, WebP or PDF · Maximum 5 MB per file.</p>

      <div className="ak-group-report-privacy">
        Reports are confidential. The Group Creator and other group members cannot see who submitted a report. Reports are reviewed by authorized Akiba personnel.
      </div>
      <button className="ak-group-report-submit" type="submit">Submit report</button>
    </form>
  );
}
