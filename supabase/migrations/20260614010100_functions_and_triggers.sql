-- Posterly credit functions, new-user provisioning, and append-only enforcement.

-- =========================================================================
-- Credit balance (sum of the ledger)
-- =========================================================================

create or replace function public.get_credit_balance(p_user_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance int;
begin
  -- Authenticated callers may only read their own balance. The service role
  -- (auth.uid() is null) is unrestricted.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized to read this balance'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(sum(delta), 0)::int
    into v_balance
  from public.credit_transactions
  where user_id = p_user_id;

  return v_balance;
end;
$$;

-- =========================================================================
-- Spend credits (atomic, never negative)
-- =========================================================================

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount  int,
  p_reason  text,
  p_ref_id  text default null
)
returns int
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance int;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized to spend on behalf of this user'
      using errcode = 'insufficient_privilege';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be a positive integer'
      using errcode = 'check_violation';
  end if;

  -- Serialize concurrent spends for this user so the balance check and the
  -- ledger insert are atomic; prevents the balance ever going negative.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(delta), 0)::int
    into v_balance
  from public.credit_transactions
  where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'insufficient credits: balance % is less than amount %', v_balance, p_amount
      using errcode = 'check_violation';
  end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (p_user_id, -p_amount, p_reason, p_ref_id);

  return v_balance - p_amount;
end;
$$;

-- =========================================================================
-- Auto-provision profile + 5 free credits on new auth user
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;

  insert into public.credit_transactions (user_id, delta, reason)
  values (new.id, 5, 'signup_bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Enforce append-only ledger (blocks UPDATE/DELETE even for the service role)
-- =========================================================================

create or replace function public.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credit_transactions is append-only';
end;
$$;

drop trigger if exists credit_transactions_no_update on public.credit_transactions;
create trigger credit_transactions_no_update
  before update on public.credit_transactions
  for each row execute function public.prevent_mutation();

drop trigger if exists credit_transactions_no_delete on public.credit_transactions;
create trigger credit_transactions_no_delete
  before delete on public.credit_transactions
  for each row execute function public.prevent_mutation();

-- =========================================================================
-- Function privileges
-- =========================================================================

revoke all on function public.get_credit_balance(uuid) from public;
grant execute on function public.get_credit_balance(uuid) to authenticated, service_role;

revoke all on function public.spend_credits(uuid, int, text, text) from public;
grant execute on function public.spend_credits(uuid, int, text, text) to authenticated, service_role;

revoke all on function public.handle_new_user() from public;
revoke all on function public.prevent_mutation() from public;
