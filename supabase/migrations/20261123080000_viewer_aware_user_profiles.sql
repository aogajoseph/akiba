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
  v_shares_active_group boolean := false;
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

  select exists (
    select 1
    from public.akiba_group_memberships viewer_members
    join public.akiba_group_memberships subject_members
      on subject_members.group_id = viewer_members.group_id
    join public.akiba_groups g
      on g.id = viewer_members.group_id
    where viewer_members.user_id = v_viewer_id
      and subject_members.user_id = v_subject_id
      and viewer_members.status = 'active'
      and subject_members.status = 'active'
      and g.status = 'active'
      and g.deleted_at is null
  ) into v_shares_active_group;

  return query
  select
    p.display_name,
    p.username,
    p.avatar_path,
    p.bio,
    case
      when (
        coalesce(ps.email_visibility, 'only_me') = 'all_akiba_users'
        or (
          coalesce(ps.email_visibility, 'only_me') = 'group_members'
          and (v_shares_active_group or (v_preview and exists (
            select 1 from public.akiba_group_memberships sm
            join public.akiba_groups sg on sg.id = sm.group_id
            where sm.user_id = v_subject_id
              and sm.status = 'active'
              and sg.status = 'active'
              and sg.deleted_at is null
          )))
        )
      ) then u.email is not null
      else false
    end as email_visible,
    case
      when (
        coalesce(ps.email_visibility, 'only_me') = 'all_akiba_users'
        or (
          coalesce(ps.email_visibility, 'only_me') = 'group_members'
          and (v_shares_active_group or (v_preview and exists (
            select 1 from public.akiba_group_memberships sm
            join public.akiba_groups sg on sg.id = sm.group_id
            where sm.user_id = v_subject_id
              and sm.status = 'active'
              and sg.status = 'active'
              and sg.deleted_at is null
          )))
        )
      ) then u.email
      else null
    end as email_address,
    case
      when (
        coalesce(ps.phone_visibility, 'only_me') = 'all_akiba_users'
        or (
          coalesce(ps.phone_visibility, 'only_me') = 'group_members'
          and (v_shares_active_group or (v_preview and exists (
            select 1 from public.akiba_group_memberships sm
            join public.akiba_groups sg on sg.id = sm.group_id
            where sm.user_id = v_subject_id
              and sm.status = 'active'
              and sg.status = 'active'
              and sg.deleted_at is null
          )))
        )
      ) then c.phone_number
      else null
    end as phone_number,
    (
      c.phone_number is not null
      and (
        coalesce(ps.phone_visibility, 'only_me') = 'all_akiba_users'
        or (
          coalesce(ps.phone_visibility, 'only_me') = 'group_members'
          and (v_shares_active_group or (v_preview and exists (
            select 1 from public.akiba_group_memberships sm
            join public.akiba_groups sg on sg.id = sm.group_id
            where sm.user_id = v_subject_id
              and sm.status = 'active'
              and sg.status = 'active'
              and sg.deleted_at is null
          )))
        )
      )
    ) as phone_visible,
    case
      when (
        coalesce(ps.location_visibility, 'only_me') = 'all_akiba_users'
        or (
          coalesce(ps.location_visibility, 'only_me') = 'group_members'
          and (v_shares_active_group or (v_preview and exists (
            select 1 from public.akiba_group_memberships sm
            join public.akiba_groups sg on sg.id = sm.group_id
            where sm.user_id = v_subject_id
              and sm.status = 'active'
              and sg.status = 'active'
              and sg.deleted_at is null
          )))
        )
      ) then c.location
      else null
    end as location,
    (
      c.location is not null
      and (
        coalesce(ps.location_visibility, 'only_me') = 'all_akiba_users'
        or (
          coalesce(ps.location_visibility, 'only_me') = 'group_members'
          and (v_shares_active_group or (v_preview and exists (
            select 1 from public.akiba_group_memberships sm
            join public.akiba_groups sg on sg.id = sm.group_id
            where sm.user_id = v_subject_id
              and sm.status = 'active'
              and sg.status = 'active'
              and sg.deleted_at is null
          )))
        )
      )
    ) as location_visible
  from public.akiba_profiles p
  join auth.users u on u.id = p.user_id
  left join public.akiba_user_contacts c on c.user_id = p.user_id
  left join public.akiba_user_privacy_settings ps on ps.user_id = p.user_id
  where p.user_id = v_subject_id;
end;
$function$;

revoke all on function public.akiba_get_profile_by_username(text, boolean) from public, anon;
grant execute on function public.akiba_get_profile_by_username(text, boolean) to authenticated;
