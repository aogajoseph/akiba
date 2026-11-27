"use client";

import type { FormEvent } from "react";
import { deactivateGroup } from "@/app/workspace/actions";

export default function DeactivateGroupForm({ groupId }: { groupId: string }) {
  function confirmDeactivation(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Deactivate this group now? New activity will stop immediately, and the group will be scheduled for deletion after six months. Financial records will be retained.")) {
      event.preventDefault();
    }
  }

  return (
    <form className="ak-deactivate-group-form" action={deactivateGroup} onSubmit={confirmDeactivation}>
      <input type="hidden" name="group_id" value={groupId} />
      <button type="submit" className="ak-member-danger">Deactivate group</button>
    </form>
  );
}
