#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the disposable CI PostgreSQL service}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PSQL=(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f "$ROOT/tests/db/postgres-bootstrap.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261103052659_finance_ledger_foundation.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261103100000_finance_workflows_foundation.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104120000_seed_safaricom_daraja_payment_provider.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104140000_mpesa_stk_contribution_posting.sql"
"${PSQL[@]}" -f "$ROOT/tests/db/mpesa-posting-regression.sql"

call_rpc() {
  "${PSQL[@]}" -Atc "select public.post_mpesa_contribution('ws_CO_CI_0001','CI00000001',500,'KES','0');"
}

# Two independent database sessions race the same checkout/receipt. Row locks
# must serialize them and both calls must resolve to the one transaction ID.
call_rpc > /tmp/mpesa-rpc-1.out &
pid1=$!
call_rpc > /tmp/mpesa-rpc-2.out &
pid2=$!
wait "$pid1"
wait "$pid2"
result1="$(tr -d '[:space:]' < /tmp/mpesa-rpc-1.out)"
result2="$(tr -d '[:space:]' < /tmp/mpesa-rpc-2.out)"
if [[ -z "$result1" || "$result1" != "$result2" ]]; then
  echo "Concurrent replay returned different or empty transaction IDs" >&2
  cat /tmp/mpesa-rpc-1.out /tmp/mpesa-rpc-2.out >&2
  exit 1
fi

# Assertions run after both calls have committed.
"${PSQL[@]}" -Atc "
  do \$\$
  declare n bigint; lines bigint;
  begin
    select count(*) into n from public.akiba_financial_transactions
      where reference='mpesa:ws_CO_CI_0001';
    select count(*) into lines from public.akiba_financial_ledger_entries e
      join public.akiba_financial_transactions t on t.id=e.transaction_id
      where t.reference='mpesa:ws_CO_CI_0001';
    if n <> 1 or lines <> 2 then
      raise exception 'Concurrent replay produced % transactions and % ledger lines', n, lines;
    end if;
  end;
  \$\$;
"
echo "Concurrent duplicate callback replay passed (transaction $result1)."
"${PSQL[@]}" -f "$ROOT/tests/db/mpesa-posting-verification.sql"
