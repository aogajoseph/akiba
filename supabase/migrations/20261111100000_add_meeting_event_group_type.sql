-- Add Meeting as a supported Event group type.
-- This is a forward-only constraint update; existing group types remain valid.
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
      'family_support','shared_savings','community_project','other_goal'
    )) or
    (purpose = 'chama' and group_type in (
      'rotating_savings','table_banking','accumulating_savings','investment_chama','other_chama'
    ))
  );
