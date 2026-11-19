# Akiba internal moderation access

Group reports are private. Reporters can read only their own report records. Other group members, including the Group Creator, cannot read a report unless they are independently authorized internal moderators. Evidence files and moderation audit records are visible only to active internal moderators.

## Provisioning a reviewer

There is intentionally no client-facing way to grant moderation access. A trusted project operator must first create the person's Akiba account, then add the account's auth user UUID to `public.akiba_internal_moderators` using the Supabase SQL editor under a trusted administrative role:

```sql
insert into public.akiba_internal_moderators (user_id, is_active)
values ('<auth.users.id>', true)
on conflict (user_id) do update set is_active = true;
```

Deactivate access with:

```sql
update public.akiba_internal_moderators
set is_active = false
where user_id = '<auth.users.id>';
```

Do not expose this table or these operations through the public Data API. The table has RLS enabled and no privileges for `anon` or `authenticated`; only trusted administrative access (including service_role) can provision reviewers.

## Operational notes

- New reports begin in `pending`.
- An authorized reviewer can assign a report and move it to `under_review`, `resolved`, or `dismissed` through the reviewer-only RPC.
- A resolution note is required to close a report.
- Status, assignment, and resolution changes are appended to `akiba_group_report_audit`.
- Report submission never changes group status, membership, access, or financial records.
- Evidence is stored in the private `akiba-group-report-evidence` bucket. Current limits: five files per report, 5 MB per file, JPG, PNG, WebP, and PDF.
- The internal moderation workspace is deliberately not part of this milestone.
