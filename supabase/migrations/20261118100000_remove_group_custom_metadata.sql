begin;

-- Remove the optional custom group metadata feature and expose a settings RPC
-- that accepts only the standard Event/Goal group fields.
drop function if exists public.akiba_update_group_settings(uuid, text, text, text, text, date, date, numeric, text, text, jsonb);
drop table if exists public.akiba_group_custom_metadata;

create or replace function public.akiba_update_group_settings(
  p_group_id uuid,
  p_name text,
  p_group_type text,
  p_description text,
  p_event_location text,
  p_event_date date,
  p_deadline date,
  p_target_amount numeric,
  p_currency_code text,
  p_group_image_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_row public.akiba_groups%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;
  if p_group_id is null then
    raise exception 'Group is required';
  end if;

  select * into group_row
  from public.akiba_groups
  where id = p_group_id
  for update;
  if not found then
    raise exception 'Group not found';
  end if;
  if group_row.created_by <> actor_id
     or not exists (
       select 1
       from public.akiba_group_memberships m
       where m.group_id = p_group_id
         and m.user_id = actor_id
         and m.role = 'group_creator'
         and m.status = 'active'
     ) then
    raise exception 'Only the Group Creator can update group settings';
  end if;
  if group_row.status <> 'active' then
    raise exception 'Deactivated groups are read-only';
  end if;
  if group_row.purpose not in ('event', 'goal') then
    raise exception 'Settings for this group type are not available yet';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Group name must contain between 1 and 80 characters';
  end if;
  if p_description is null or char_length(p_description) > 500 then
    raise exception 'Group description cannot exceed 500 characters';
  end if;
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'Enter a valid three-letter currency code';
  end if;
  if p_target_amount is not null and (p_target_amount <= 0 or p_target_amount > 999999999999.99) then
    raise exception 'Target amount must be greater than zero and within the supported range';
  end if;

  if group_row.purpose = 'event' then
    if p_group_type not in (
      'birthday', 'wedding', 'graduation', 'funeral_bereavement',
      'party_celebration', 'trip_vacation', 'community_event',
      'meeting', 'fundraiser', 'other_event'
    ) then
      raise exception 'Choose a valid Event category';
    end if;
    if p_event_location is not null and char_length(btrim(p_event_location)) > 200 then
      raise exception 'Event location cannot exceed 200 characters';
    end if;
  else
    if p_group_type not in (
      'rent_housing', 'education', 'business_investment', 'land_property',
      'vehicle_purchase', 'fundraising', 'project_purchase', 'family_support',
      'shared_savings', 'community_project', 'other_goal'
    ) then
      raise exception 'Choose a valid Goal category';
    end if;
    if p_event_location is not null or p_event_date is not null then
      raise exception 'Location and event date apply only to Event groups';
    end if;
  end if;

  if p_group_image_path is not null and
     p_group_image_path !~ (
       '^' || actor_id::text || '/' || p_group_id::text ||
       '(-[0-9a-f-]{36})?\.(jpg|png|webp)$'
     ) then
    raise exception 'The selected group image path is invalid';
  end if;

  if p_currency_code is distinct from group_row.currency_code then
    if p_currency_code <> 'KES' then
      raise exception 'KES is the only currency currently supported for group currency changes';
    end if;
    if exists (select 1 from public.akiba_contribution_intents where group_id = p_group_id)
       or exists (
         select 1 from public.akiba_payment_attempts a
         join public.akiba_contribution_intents i on i.id = a.contribution_intent_id
         where i.group_id = p_group_id
       )
       or exists (select 1 from public.akiba_financial_transactions where group_id = p_group_id)
       or exists (select 1 from public.akiba_financial_ledger_entries where group_id = p_group_id)
       or exists (select 1 from public.akiba_withdrawal_requests where group_id = p_group_id)
       or exists (select 1 from public.akiba_financial_reservations where group_id = p_group_id)
       or exists (select 1 from public.akiba_group_payment_accounts where group_id = p_group_id)
       or exists (select 1 from public.akiba_withdrawal_approvals where group_id = p_group_id) then
      raise exception 'Group currency is locked because financial activity or payment setup has already started';
    end if;
  end if;

  update public.akiba_groups
  set name = btrim(p_name),
      group_type = p_group_type,
      description = btrim(p_description),
      event_location = case when group_row.purpose = 'event' then nullif(btrim(coalesce(p_event_location, '')), '') else null end,
      event_date = case when group_row.purpose = 'event' then p_event_date else null end,
      deadline = p_deadline,
      target_amount = p_target_amount,
      currency_code = p_currency_code,
      group_image_path = p_group_image_path,
      updated_at = clock_timestamp()
  where id = p_group_id;

  insert into public.akiba_group_activity (group_id, actor_id, event_type, summary)
  values (
    p_group_id,
    actor_id,
    'group_updated',
    'The Group Creator updated the group details.'
  );
end;
$fn$;

revoke all on function public.akiba_update_group_settings(uuid, text, text, text, text, date, date, numeric, text, text)
  from public, anon;
grant execute on function public.akiba_update_group_settings(uuid, text, text, text, text, date, date, numeric, text, text)
  to authenticated;




commit;
