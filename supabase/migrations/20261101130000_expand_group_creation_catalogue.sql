-- Expand Akiba Groups into Event, Goal and Chama configurations.
alter table public.akiba_groups
  drop constraint if exists akiba_groups_purpose_check;

alter table public.akiba_groups
  add constraint akiba_groups_purpose_check
  check (purpose in ('event', 'goal', 'chama'));

alter table public.akiba_groups
  add column if not exists group_type text,
  add column if not exists target_amount numeric(14,2),
  add column if not exists event_date date,
  add column if not exists deadline date,
  add column if not exists contribution_frequency text,
  add column if not exists group_image_path text;

update public.akiba_groups
set group_type = case when purpose = 'event' then 'other_event' else 'other_goal' end
where group_type is null;

alter table public.akiba_groups
  alter column group_type set not null,
  add constraint akiba_groups_group_type_check check (
    (purpose = 'event' and group_type in (
      'birthday','wedding','graduation','funeral_bereavement','party_celebration',
      'trip_vacation','community_event','fundraiser','other_event'
    )) or
    (purpose = 'goal' and group_type in (
      'rent_housing','education','business_investment','land_property','vehicle_purchase',
      'family_support','shared_savings','community_project','other_goal'
    )) or
    (purpose = 'chama' and group_type in (
      'rotating_savings','table_banking','accumulating_savings','investment_chama','other_chama'
    ))
  ),
  add constraint akiba_groups_target_amount_check
    check (target_amount is null or target_amount > 0),
  add constraint akiba_groups_contribution_frequency_check
    check (contribution_frequency is null or contribution_frequency in (
      'one_time','weekly','biweekly','monthly','quarterly','annually'
    ));

-- Group cover images are public, non-sensitive decorative assets. Uploads are
-- restricted to an authenticated user's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-images', 'group-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can view group images"
  on storage.objects for select
  using (bucket_id = 'group-images');

create policy "Users upload their own group images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update their own group images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'group-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'group-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own group images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'group-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
