-- Viewer-aware profile projection. Contact tables remain owner-only;
-- this narrowly scoped authenticated RPC returns only fields the viewer may see.

create or replace function public.akiba_get_profile_by_username(
  p_username text,
  p_preview boolean default false
)
returns table (
  display_name text,
  username text,
  avatar_path text,
  bio text,
  email_address text,
  email_visible boolean,
  phone_number text,
  phone_visible boolean,
  location text,
  location_visible boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_viewer_id uuid := auth.uid();
  v_subject_id uuid;
  v_preview boolean := coalesce(p_preview, false);
  v_email_visibility text := 'only_me';
  v_phone_visibility text := 'only_me';
  v_location_visibility text := 'only_me';
  v_shares_active_group boolean := false;
  v_preview_group_access boolean := false;
  v_email_allowed boolean := false;
  v_phone_allowed boolean := false;
  v_location_allowed boolean := false;
begin
  if v_viewer_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.user_id
    into v_subject_id
  from public.akiba_profiles p
  where p.username = lower(btrim(p_username));

  if v_subject_id is null then
    return;
  end if;

  if v_preview and v_viewer_id <> v_subject_id then
    raise exception 'Only the profile owner can request a preview' using errcode = '42501';
  end if;

  select
    coalesce(ps.email_visibility, 'only_me'),
    coalesce(ps.phone_visibility, 'only_me'),
    coalesce(ps.location_visibility, 'only_me')
  into v_email_visibility, v_phone_visibility, v_location_visibility
  from (select 1) seed
  left join public.akiba_user_privacy_settings ps on ps.user_id = v_subject_id;

  select exists (
    select 1
    from public.akiba_group_memberships viewer_members
    join public.akiba_group_memberships subject_members
      on subject_members.group_id = viewer_members.group_id
    join public.akiba_groups g on g.id = viewer_members.group_id
    where viewer_members.user_id = v_viewer_id
      and subject_members.user_id = v_subject_id
      and viewer_members.status = 'active'
      and subject_members.status = 'active'
      and g.status = 'active'
      and g.deleted_at is null
  ) into v_shares_active_group;

  if v_preview then
    select exists (
      select 1
      from public.akiba_group_memberships sm
      join public.akiba_groups sg on sg.id = sm.group_id
      where sm.user_id = v_subject_id
        and sm.status = 'active'
        and sg.status = 'active'
        and sg.deleted_at is null
    ) into v_preview_group_access;
  end if;

  v_email_allowed := v_email_visibility = 'all_akiba_users'
    or (v_email_visibility = 'group_members' and (v_shares_active_group or v_preview_group_access));
  v_phone_allowed := v_phone_visibility = 'all_akiba_users'
    or (v_phone_visibility = 'group_members' and (v_shares_active_group or v_preview_group_access));
  v_location_allowed := v_location_visibility = 'all_akiba_users'
    or (v_location_visibility = 'group_members' and (v_shares_active_group or v_preview_group_access));

  return query
  select
    p.display_name,
    p.username,
    p.avatar_path,
    p.bio,
    case when v_email_allowed then u.email else null end,
    (v_email_allowed and u.email is not null),
    case when v_phone_allowed then c.phone_number else null end,
    (v_phone_allowed and c.phone_number is not null),
    case when v_location_allowed then c.location else null end,
    (v_location_allowed and c.location is not null)
  from public.akiba_profiles p
  join auth.users u on u.id = p.user_id
  left join public.akiba_user_contacts c on c.user_id = p.user_id
  where p.user_id = v_subject_id;
end;
$function$;

revoke all on function public.akiba_get_profile_by_username(text, boolean) from public, anon;
grant execute on function public.akiba_get_profile_by_username(text, boolean) to authenticated;
