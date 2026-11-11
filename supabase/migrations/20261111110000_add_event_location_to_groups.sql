-- Store an optional venue/location for Event groups.
-- Forward-only: existing groups remain valid with a NULL location.
alter table public.akiba_groups
  add column if not exists event_location text;

comment on column public.akiba_groups.event_location is
  'Optional venue or location where an Event group is scheduled to take place.';
