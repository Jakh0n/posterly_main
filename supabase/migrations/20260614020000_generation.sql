-- Posterly generation pipeline: credit refunds + Realtime for campaign progress.

-- =========================================================================
-- Record the failure reason on a campaign
-- =========================================================================

alter table public.campaigns add column if not exists error text;

-- =========================================================================
-- Refund credits (safe, idempotent, owner-scoped)
-- =========================================================================
-- Refunds exactly what was spent on a single failed campaign, at most once.
-- Cannot mint credits: the refund amount is derived from the recorded spend
-- for that campaign, the campaign must be owned by the user AND in 'failed'
-- status, and a second call is a no-op once a refund row exists.

create or replace function public.refund_credits(
  p_user_id uuid,
  p_ref_id  text
)
returns int
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_spent     int;
  v_refunded  int;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not authorized to refund on behalf of this user'
      using errcode = 'insufficient_privilege';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Only failed campaigns owned by the caller are refundable.
  if not exists (
    select 1 from public.campaigns c
    where c.id = p_ref_id::uuid
      and c.user_id = p_user_id
      and c.status = 'failed'
  ) then
    raise exception 'no refundable campaign for ref %', p_ref_id
      using errcode = 'check_violation';
  end if;

  -- Amount actually charged for this campaign (sum of negative deltas).
  select coalesce(-sum(delta), 0)::int
    into v_spent
  from public.credit_transactions
  where user_id = p_user_id and ref_id = p_ref_id and reason = 'campaign';

  if v_spent <= 0 then
    return public.get_credit_balance(p_user_id);
  end if;

  -- Idempotency: never refund the same campaign twice.
  select coalesce(sum(delta), 0)::int
    into v_refunded
  from public.credit_transactions
  where user_id = p_user_id and ref_id = p_ref_id and reason = 'refund';

  if v_refunded > 0 then
    return public.get_credit_balance(p_user_id);
  end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (p_user_id, v_spent, 'refund', p_ref_id);

  return public.get_credit_balance(p_user_id);
end;
$$;

revoke all on function public.refund_credits(uuid, text) from public;
grant execute on function public.refund_credits(uuid, text) to authenticated, service_role;

-- =========================================================================
-- Realtime: stream campaign status + creative inserts to the owner
-- =========================================================================
-- RLS still applies to realtime, so users only receive their own rows.

alter table public.campaigns replica identity full;
alter table public.creatives replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table public.campaigns;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'creatives'
  ) then
    alter publication supabase_realtime add table public.creatives;
  end if;
end;
$$;
