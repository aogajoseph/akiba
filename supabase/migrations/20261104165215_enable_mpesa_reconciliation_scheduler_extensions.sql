-- Enable Supabase's database scheduler and asynchronous HTTP client.
-- The scheduled job and its credentials are configured separately per environment.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
