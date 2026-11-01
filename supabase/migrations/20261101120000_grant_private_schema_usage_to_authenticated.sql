-- Authenticated clients need schema USAGE to evaluate the group-roster RLS helper.
-- Keep akiba_private out of the exposed Data API schemas; this grant only permits
-- resolving explicitly executable functions in the private schema.
grant usage on schema akiba_private to authenticated;
