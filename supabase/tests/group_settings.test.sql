\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'authenticated', 'authenticated', 'group-settings-' || n || '@akiba.test',
       '', now(), now(), now()
from generate_series(401, 404) as n
on conflict (id) do nothing;

insert into public.akiba_payment_providers (id, provider_code, display_name)
values ('20000000-0000-0000-0000-000000000401', 'group_settings_test', 'Group Settings Test')
on conflict (id) do nothing;

do $test$
begin
  if not has_function_privilege(
    'authenticated',
    'public.akiba_update_group_settings(uuid,text,text,text,text,date,date,numeric,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users cannot execute the group settings RPC';
  end if;
  if has_function_privilege(
    'anon',
    'public.akiba_update_group_settings(uuid,text,text,text,text,date,date,numeric,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users can execute the group settings RPC';
  end if;
  if not has_table_privilege('authenticated', 'public.akiba_group_custom_metadata', 'SELECT') then
    raise exception 'Authenticated group members cannot read custom metadata';
  end if;
  if has_table_privilege('authenticated', 'public.akiba_group_custom_metadata', 'INSERT')
     or has_table_privilege('authenticated', 'public.akiba_group_custom_metadata', 'UPDATE')
     or has_table_privilege('authenticated', 'public.akiba_group_custom_metadata', 'DELETE') then
    raise exception 'Authenticated users have direct write privileges on custom metadata';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);

insert into public.akiba_groups
  (id, name, purpose, group_type, currency_code, created_by)
values
  ('10000000-0000-0000-0000-000000000401', 'Event settings test', 'event', 'birthday', 'KES',
   '00000000-0000-0000-0000-000000000401'),
  ('10000000-0000-0000-0000-000000000402', 'Goal settings test', 'goal', 'project_purchase', 'USD',
   '00000000-0000-0000-0000-000000000401'),
  ('10000000-0000-0000-0000-000000000403', 'Locked currency test', 'goal', 'fundraising', 'USD',
   '00000000-0000-0000-0000-000000000401');

insert into public.akiba_group_memberships (group_id, user_id, role, status)
values
  ('10000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000402', 'member', 'active'),
  ('10000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000403', 'member', 'active');

select public.akiba_set_group_admin(
  '10000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000402',
  'appoint'
);

-- The creator can edit an Event and manage its extensible metadata.
select public.akiba_update_group_settings(
  '10000000-0000-0000-0000-000000000401',
  'Updated wedding group',
  'wedding',
  'Updated event description',
  'Nairobi',
  '2026-12-20',
  '2026-12-10',
  150000,
  'KES',
  null,
  '[
    {"label":"Dress code","field_type":"text","value":"Formal"},
    {"label":"Venue contact","field_type":"number","value":"0712345678"},
    {"label":"Event link","field_type":"url","value":"https://akiba.test/event"},
    {"label":"Event day","field_type":"date","value":"2026-12-20"}
  ]'::jsonb
);

do $test$
declare
  field_count integer;
  first_value text;
begin
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000401'
      and purpose = 'event'
      and group_type = 'wedding'
      and name = 'Updated wedding group'
      and event_location = 'Nairobi'
      and event_date = '2026-12-20'
      and deadline = '2026-12-10'
      and target_amount = 150000
      and currency_code = 'KES'
  ) then
    raise exception 'Event settings were not persisted correctly';
  end if;

  select count(*) into field_count
  from public.akiba_group_custom_metadata
  where group_id = '10000000-0000-0000-0000-000000000401';
  if field_count <> 4 then raise exception 'Expected four custom Event details, got %', field_count; end if;

  select value into first_value
  from public.akiba_group_custom_metadata
  where group_id = '10000000-0000-0000-0000-000000000401'
  order by display_order
  limit 1;
  if first_value <> 'Formal' then raise exception 'Custom metadata order was not persisted'; end if;
end;
$test$;

-- Updating existing custom details replaces the set and preserves the new order.
select public.akiba_update_group_settings(
  '10000000-0000-0000-0000-000000000401',
  'Updated wedding group',
  'wedding',
  'Updated event description',
  'Nairobi',
  '2026-12-20',
  '2026-12-10',
  150000,
  'KES',
  null,
  '[{"label":"Dress code","field_type":"text","value":"Smart casual"}]'::jsonb
);

do $test$
declare field_count integer; field_value text;
begin
  select count(*) into field_count from public.akiba_group_custom_metadata
  where group_id = '10000000-0000-0000-0000-000000000401';
  select value into field_value from public.akiba_group_custom_metadata
  where group_id = '10000000-0000-0000-0000-000000000401' and label = 'Dress code';
  if field_count <> 1 or field_value <> 'Smart casual' then
    raise exception 'Existing custom metadata could not be updated and removed';
  end if;
end;
$test$;

-- Goal metadata excludes Event-only fields and can move to the supported currency
-- before any financial or payment artifact exists.
do $test$
begin
  if public.akiba_group_currency_is_locked('10000000-0000-0000-0000-000000000402') then
    raise exception 'A new Goal group was unexpectedly currency-locked';
  end if;
end;
$test$;

select public.akiba_update_group_settings(
  '10000000-0000-0000-0000-000000000402',
  'Updated fundraising goal',
  'fundraising',
  'Updated goal description',
  null,
  null,
  '2027-01-31',
  500000,
  'KES',
  null,
  '[{"label":"Project location","field_type":"text","value":"Kiambu"}]'::jsonb
);

do $test$
begin
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000402'
      and purpose = 'goal'
      and group_type = 'fundraising'
      and currency_code = 'KES'
      and event_location is null
      and event_date is null
      and deadline = '2027-01-31'
      and target_amount = 500000
  ) then
    raise exception 'Goal settings or currency change were not persisted correctly';
  end if;
end;
$test$;

-- Both Group Admins and ordinary Members are denied by the database RPC.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000402', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_update_group_settings(
      '10000000-0000-0000-0000-000000000401',
      'Forged admin edit', 'wedding', 'No', 'Nairobi', '2026-12-20',
      '2026-12-10', 150000, 'KES', null, '[]'::jsonb
    );
    raise exception 'Group Admin unexpectedly updated group settings';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Only the Group Creator can update group settings%' then raise; end if;
  end;
end;
$test$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000403', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_update_group_settings(
      '10000000-0000-0000-0000-000000000401',
      'Forged member edit', 'wedding', 'No', 'Nairobi', '2026-12-20',
      '2026-12-10', 150000, 'KES', null, '[]'::jsonb
    );
    raise exception 'Ordinary Member unexpectedly updated group settings';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Only the Group Creator can update group settings%' then raise; end if;
  end;
end;
$test$;

-- Standard metadata labels cannot be duplicated as custom details.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_update_group_settings(
      '10000000-0000-0000-0000-000000000401',
      'Updated wedding group', 'wedding', 'Updated event description',
      'Nairobi', '2026-12-20', '2026-12-10', 150000, 'KES', null,
      '[{"label":"Group Name","field_type":"text","value":"Duplicate"}]'::jsonb
    );
    raise exception 'A custom field duplicated a standard field label';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%standard group settings fields%' then raise; end if;
  end;
end;
$test$;

-- A Goal cannot acquire Event-only location or event-date fields.
do $test$
declare message text;
begin
  begin
    perform public.akiba_update_group_settings(
      '10000000-0000-0000-0000-000000000402',
      'Updated fundraising goal', 'fundraising', 'Updated goal description',
      null, '2026-12-20', '2027-01-31', 500000, 'KES', null, '[]'::jsonb
    );
    raise exception 'Goal unexpectedly accepted Event-only metadata';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Location and event date apply only to Event groups%' then raise; end if;
  end;
end;
$test$;

-- Payment-account setup is a currency-lock point, even before a contribution.
insert into public.akiba_group_payment_accounts (group_id, provider_id, account_status)
values ('10000000-0000-0000-0000-000000000403',
        '20000000-0000-0000-0000-000000000401', 'pending');

do $test$
declare message text;
begin
  if not public.akiba_group_currency_is_locked('10000000-0000-0000-0000-000000000403') then
    raise exception 'Payment account setup did not lock group currency';
  end if;
  begin
    perform public.akiba_update_group_settings(
      '10000000-0000-0000-0000-000000000403',
      'Locked currency test', 'fundraising', 'Locked group',
      null, null, null, 10000, 'KES', null, '[]'::jsonb
    );
    raise exception 'Currency changed after payment account setup';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%currency is locked%' then raise; end if;
  end;
end;
$test$;

-- A deactivated group is read-only, including through a direct RPC call.
select public.akiba_deactivate_group('10000000-0000-0000-0000-000000000401');

do $test$
declare message text;
begin
  begin
    perform public.akiba_update_group_settings(
      '10000000-0000-0000-0000-000000000401',
      'Should not save', 'wedding', 'No', 'Nairobi', '2026-12-20',
      '2026-12-10', 150000, 'KES', null, '[]'::jsonb
    );
    raise exception 'A deactivated group unexpectedly accepted settings changes';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Deactivated groups are read-only%' then raise; end if;
  end;
end;
$test$;

rollback;
