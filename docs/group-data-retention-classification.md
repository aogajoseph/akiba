# Akiba group data retention and privacy classification

**Scope:** group records after the Group Creator deactivates a group.  
**Current lifecycle:** deactivation immediately disables group activity; the retention clock begins at deactivation; the automated database purge runs after six months.  
**Status:** engineering classification for implementation. It is not a legal opinion or a final statutory retention schedule. Globe Legal must approve the retention period and any financial-record redaction rules before production launch.

## Classification

| Data class | Examples | Treatment at six-month purge | Reason / control |
|---|---|---|---|
| Group identity and purpose | Group name, description, event location, target, dates, frequency, group image path | Scrub from the group row. Keep only a minimal deleted-group tombstone and deletion timestamps. | Stops a deactivated group remaining discoverable as an active social space. |
| Group image object | Object in the `group-images` bucket | Queue the stored object path in the deletion record; delete through the Supabase Storage API; clear the path after confirmed deletion. | Storage object rows must not be deleted with SQL. A fixed bucket and group-ID-prefixed path validation prevent arbitrary object deletion. |
| Membership and access | Memberships, invitation tokens/recipient details, blocks, membership-role events | Delete at purge. | These records are operational access data, not financial evidence. Invitation tokens are digests only and become unnecessary after the group retention period. |
| Group communication and social activity | Group messages, group activity summaries, in-app group notifications | Delete at purge. | Removes personal conversations and membership context after the retention period. |
| Payment-account operational metadata | Provider account reference, provider-specific metadata, account status | Preserve the account row and stable identifiers needed by financial foreign keys; clear provider account reference and metadata; set account status to closed. | Provider operations must already be terminal before purge. Retaining the relational anchor avoids breaking financial references while removing reusable provider credentials/identifiers. |
| Financial transaction evidence | Contribution intents, financial transactions, ledger entries, reservations, withdrawal requests and approvals, provider events | Preserve the records and their relational identifiers. Do not cascade-delete the ledger or transaction history. | Financial integrity, reconciliation, disputes, fraud investigation and statutory recordkeeping may require these records. |
| Personal data embedded in financial evidence | Contributor/initiator/approver IDs, recipient name, destination token/snapshot, rejection/resolution notes, finance activity payloads and provider receipts | **Retain provisionally, subject to Legal's approved schedule and minimization rules.** Restrict access to authorized finance/support roles. Redact or tokenize fields when their operational/legal purpose ends. | These fields can identify people or expose payment destinations. They must not be treated as harmless metadata merely because they occur in finance tables. |
| Minimal deletion evidence | Group ID tombstone, deactivation/delete timestamps, financial row counts, image cleanup status | Retain as a minimal operational record. Remove the image path after successful object deletion. | Supports auditability and retry/verification without preserving the old group profile. |

## Worker behaviour

1. The database retention worker waits for contribution intents and withdrawals to reach terminal states.
2. It removes group memberships, blocks, invitations, messages, membership events, group activity and notifications.
3. It scrubs group identity fields and writes a deletion record with the original image object path and financial record counts.
4. The deletion-record trigger closes payment accounts and clears provider account references and metadata after the provider-operation gate has passed.
5. The hourly Edge Function claims pending/failed image-cleanup records and calls `storage.from('group-images').remove([path])`. It validates that the object path is a UUID group prefix followed by a UUID filename with an approved image extension.
6. A successful removal clears the stored object path and marks cleanup complete. Failures are retained for retry; after 20 attempts they remain failed for manual investigation rather than being silently discarded.


## Deactivation and hard-deletion safeguards

- Immediate hard deletion is permitted only when there has never been any financial footprint: no contribution intents or payment attempts (including failed/expired attempts), no withdrawal requests or approvals, no payout attempts, no reservations, no finance activity events, no payment-account setup, no financial transactions and no ledger entries.
- The authoritative group balance is the net of credits and debits in the `group_funds` ledger account. Active reservations are counted separately as held funds.
- Deactivation is blocked while any contribution/payment operation, withdrawal, payout or reconciliation is unresolved, while funds are held, or while the group ledger balance is non-zero. A settled financial history with a zero balance does not prevent deactivation.
- Financial history permanently disqualifies a group from immediate hard deletion, even when every transaction is settled and the balance is zero.
- A Group Creator may reactivate a deactivated (not yet retention-purged) group. Reactivation clears the six-month deadline, restores normal group operation, and writes a lifecycle audit record so outstanding financial matters can be settled.
- The six-month retention worker repeats the unresolved-operation, held-funds and balance checks before scrubbing social/group profile data. It preserves financial evidence and the stable group row/ID.
- Hard deletion requires the exact current group name. Authorization, financial history, unresolved activity, held funds and balance are checked again atomically under a lock in the database RPC.
- Hard-deletion audit evidence is stored without a foreign key to the deleted group. Group images, chat attachments and private report evidence are queued for Storage API cleanup; SQL never deletes Storage objects directly.

## Decisions still requiring Legal approval

- Confirm the six-month period against applicable Kenyan and other operating-country financial, tax, AML/CFT, consumer-protection and data-protection requirements.
- Define separate retention periods for transaction/ledger evidence, provider event logs, withdrawal destination details and financial activity payloads.
- Decide when contributor, recipient and approver identifiers may be pseudonymized while retaining a legally sufficient audit trail.
- Approve access controls and audit logging for retained financial records, including who may retrieve destination snapshots and provider references.
- Define a process for legal holds, disputes, chargebacks and regulator requests that pauses deletion or redaction.
- Confirm whether deletion records and financial tombstones need a separate archival expiry after all statutory retention periods end.

**Do not shorten or delete financial evidence automatically until these decisions are approved.** The current implementation minimizes provider-account metadata but deliberately preserves financial evidence and potentially identifying fields pending a formal Legal decision.
