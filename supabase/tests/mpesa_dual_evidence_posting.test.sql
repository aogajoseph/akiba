-- Regression test: M-Pesa ledger posting requires two durable evidence records.
-- Run after all migrations against a clean local Supabase database.

do $test$
declare
  new_signature regprocedure;
begin
  if to_regprocedure('public.post_mpesa_contribution(text,text,bigint,text,uuid,uuid)') is null then
    raise exception 'Dual-evidence contribution posting RPC is missing';
  end if;

  if to_regprocedure('public.post_mpesa_contribution(text,text,bigint,text,text)') is not null then
    raise exception 'Legacy callback-only contribution posting RPC still exists';
  end if;

  new_signature := to_regprocedure('public.post_mpesa_contribution(text,text,bigint,text,uuid,uuid)');

  if has_function_privilege('anon', new_signature, 'EXECUTE')
     or has_function_privilege('authenticated', new_signature, 'EXECUTE') then
    raise exception 'Untrusted API roles must not execute the contribution posting RPC';
  end if;

  if not has_function_privilege('service_role', new_signature, 'EXECUTE') then
    raise exception 'Trusted service role must be able to execute the contribution posting RPC';
  end if;

  if has_table_privilege('authenticated', 'public.akiba_provider_verifications', 'SELECT')
     or has_table_privilege('authenticated', 'public.akiba_provider_verifications', 'INSERT') then
    raise exception 'Authenticated clients must not read or write provider verification evidence';
  end if;

  if has_table_privilege('service_role', 'public.akiba_provider_verifications', 'INSERT') is false then
    raise exception 'Service role must be able to persist provider verification evidence';
  end if;

  begin
    perform public.post_mpesa_contribution(null, null, null, null, null, null);
    raise exception 'RPC accepted a call without callback and provider evidence';
  exception
    when others then
      if sqlerrm not like 'Both authenticated callback and provider verification evidence are required%' then
        raise;
      end if;
  end;
end;
$test$;

select 'M-Pesa dual-evidence posting guards passed' as result;
