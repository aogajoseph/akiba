-- Group Settings: creator-only editing and extensible group metadata.
begin;

-- Keep the Group Type (Event or Goal) separate from its editable Category.
-- Goal categories include fundraising and project-purchase use cases.
alter table public.akiba_groups
  drop constraint if exists akiba_groups_group_type_check;

alter table public.akiba_groups
  add constraint akiba_groups_group_type_check check (
    (purpose = 'event' and group_type in (
      'birthday','wedding','graduation','funeral_bereavement','party_celebration',
      'trip_vacation','community_event','meeting','fundraiser','other_event'
    )) or
    (purpose = 'goal' and group_type in (
      'rent_housing','education','business_investment','land_property','vehicle_purchase',
      'fundraising','project_purchase','family_support','shared_savings','community_project','other_goal'
    )) or
    (purpose = 'chama' and group_type in (
      'rotating_savings','table_banking','accumulating_savings','investment_chama','other_chama'
    ))
  );

create table if not exists public.akiba_group_custom_metadata (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  field_type text not null check (field_type in ('text', 'number', 'date', 'url')),
  value text not null check (char_length(btrim(value)) between 1 and 500),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists akiba_group_custom_metadata_group_label_uidx
  on public.akiba_group_custom_metadata (group_id, lower(btrim(label)));
create index if not exists akiba_group_custom_metadata_group_order_idx
  on public.akiba_group_custom_metadata (group_id, display_order, created_at);

alter table public.akiba_group_custom_metadata enable row level security;
drop policy if exists "active members read group custom metadata" on public.akiba_group_custom_metadata;
create policy "active members read group custom metadata"
  on public.akiba_group_custom_metadata for select to authenticated
  using (akiba_private.is_active_group_member(group_id));

revoke all on public.akiba_group_custom_metadata from public, anon, authenticated;
grant select on public.akiba_group_custom_metadata to authenticated;

comment on table public.akiba_group_custom_metadata is
  'Creator-managed additional descriptive fields for Event and Goal groups. Core group fields remain in akiba_groups.';

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
  p_group_image_path text,
  p_custom_fields jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_row public.akiba_groups%rowtype;
  field_item jsonb;
  field_label text;
  field_type text;
  field_value text;
  seen_labels text[] := array[]::text[];
  field_position integer := 0;
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
      'vehicle_purchase', 'family_support', 'shared_savings',
      'community_project', 'other_goal'
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

  p_custom_fields := coalesce(p_custom_fields, '[]'::jsonb);
  if jsonb_typeof(p_custom_fields) <> 'array' or jsonb_array_length(p_custom_fields) > 10 then
    raise exception 'Add no more than 10 additional group details';
  end if;

  for field_item in select value from jsonb_array_elements(p_custom_fields)
  loop
    if jsonb_typeof(field_item) <> 'object' then
      raise exception 'Each additional detail must be a field object';
    end if;
    field_label := btrim(coalesce(field_item ->> 'label', ''));
    field_type := coalesce(field_item ->> 'field_type', '');
    field_value := btrim(coalesce(field_item ->> 'value', ''));

    if char_length(field_label) not between 1 and 40 then
      raise exception 'Additional detail labels must contain between 1 and 40 characters';
    end if;
    if field_type not in ('text', 'number', 'date', 'url') then
      raise exception 'Choose a supported additional detail type';
    end if;
    if char_length(field_value) not between 1 and 500 then
      raise exception 'Additional detail values must contain between 1 and 500 characters';
    end if;
    if lower(field_label) = any(seen_labels) then
      raise exception 'Additional detail labels must be unique';
    end if;
    seen_labels := array_append(seen_labels, lower(field_label));

    if field_type = 'number' and field_value !~ '^-?[0-9]+([.][0-9]{1,2})?$' then
      raise exception 'Enter a valid number for additional detail "%" ', field_label;
    elsif field_type = 'date' then
      begin
        perform field_value::date;
      exception when others then
        raise exception 'Enter a valid date for additional detail "%" ', field_label;
      end;
    elsif field_type = 'url' and field_value !~* '^https?://' then
      raise exception 'Additional detail "%" must be an HTTP or HTTPS URL', field_label;
    end if;
  end loop;

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

  delete from public.akiba_group_custom_metadata
  where group_id = p_group_id;

  insert into public.akiba_group_custom_metadata
    (group_id, label, field_type, value, display_order)
  select
    p_group_id,
    btrim(item ->> 'label'),
    item ->> 'field_type',
    btrim(item ->> 'value'),
    (ordinality - 1)::integer
  from jsonb_array_elements(p_custom_fields) with ordinality as fields(item, ordinality);

  insert into public.akiba_group_activity (group_id, actor_id, event_type, summary)
  values (
    p_group_id,
    actor_id,
    'group_updated',
    'The Group Creator updated the group details.'
  );
end;
$fn$;

revoke all on function public.akiba_update_group_settings(uuid, text, text, text, text, date, date, numeric, text, text, jsonb)
  from public, anon;
grant execute on function public.akiba_update_group_settings(uuid, text, text, text, text, date, date, numeric, text, text, jsonb)
  to authenticated;


create or replace function public.akiba_group_currency_is_locked(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;
  if not exists (
    select 1
    from public.akiba_group_memberships m
    where m.group_id = p_group_id
      and m.user_id = actor_id
      and m.status = 'active'
  ) then
    raise exception 'You are not an active member of this group';
  end if;

  return
    exists (select 1 from public.akiba_contribution_intents where group_id = p_group_id)
    or exists (
      select 1
      from public.akiba_payment_attempts a
      join public.akiba_contribution_intents i on i.id = a.contribution_intent_id
      where i.group_id = p_group_id
    )
    or exists (select 1 from public.akiba_financial_transactions where group_id = p_group_id)
    or exists (select 1 from public.akiba_financial_ledger_entries where group_id = p_group_id)
    or exists (select 1 from public.akiba_withdrawal_requests where group_id = p_group_id)
    or exists (select 1 from public.akiba_financial_reservations where group_id = p_group_id)
    or exists (select 1 from public.akiba_group_payment_accounts where group_id = p_group_id)
    or exists (select 1 from public.akiba_withdrawal_approvals where group_id = p_group_id);
end;
$fn$;

revoke all on function public.akiba_group_currency_is_locked(uuid) from public, anon;
grant execute on function public.akiba_group_currency_is_locked(uuid) to authenticated;

commit;
