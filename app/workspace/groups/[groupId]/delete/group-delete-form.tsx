"use client";

import { hardDeleteGroup } from "@/app/workspace/actions";

export default function GroupDeleteForm({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  return (
    <form className="ak-group-report-form" action={hardDeleteGroup}>
      <input type="hidden" name="group_id" value={groupId} />
      <label htmlFor="confirm-group-name">Type the exact group name to confirm</label>
      <input
        id="confirm-group-name"
        name="confirm_name"
        type="text"
        required
        autoComplete="off"
        spellCheck={false}
        placeholder={groupName}
      />
      <p className="ak-group-report-hint">The group and its non-financial content will be permanently removed. Associated Storage files will be queued for secure cleanup. This cannot be undone.</p>
      <button className="ak-member-danger" type="submit">Permanently delete group</button>
    </form>
  );
}
