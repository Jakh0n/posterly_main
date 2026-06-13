-- Posterly initial schema
-- Tables, indexes, and Row-Level Security policies keyed to auth.uid().

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  plan       text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  logo_url   text,
  palette    jsonb,
  tone       text,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  brand_id          uuid references public.brands (id) on delete set null,
  product_name      text not null,
  price             text,
  promo             text,
  product_image_url text,
  status            text not null default 'queued'
    check (status in ('queued', 'writing', 'generating', 'composing', 'done', 'failed')),
  created_at        timestamptz not null default now()
);

create table if not exists public.creatives (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns (id) on delete cascade,
  variant_index int not null default 0,
  background_url text,
  final_url     text,
  layout        jsonb,
  created_at    timestamptz not null default now()
);

-- Append-only credit ledger. Balance is the running sum of `delta`.
create table if not exists public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  delta      int not null,
  reason     text not null,
  ref_id     text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  polar_subscription_id text unique,
  status                text,
  current_period_end    timestamptz,
  created_at            timestamptz not null default now()
);

-- =========================================================================
-- Indexes (foreign keys / common lookups)
-- =========================================================================

create index if not exists brands_user_id_idx on public.brands (user_id);
create index if not exists campaigns_user_id_idx on public.campaigns (user_id);
create index if not exists campaigns_brand_id_idx on public.campaigns (brand_id);
create index if not exists creatives_campaign_id_idx on public.creatives (campaign_id);
create index if not exists credit_transactions_user_id_idx on public.credit_transactions (user_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

-- =========================================================================
-- Row-Level Security
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.campaigns enable row level security;
alter table public.creatives enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: a user can read and update only their own profile.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- brands: full ownership by user_id.
create policy "brands_select_own" on public.brands
  for select to authenticated
  using (auth.uid() = user_id);

create policy "brands_insert_own" on public.brands
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "brands_update_own" on public.brands
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brands_delete_own" on public.brands
  for delete to authenticated
  using (auth.uid() = user_id);

-- campaigns: full ownership by user_id.
create policy "campaigns_select_own" on public.campaigns
  for select to authenticated
  using (auth.uid() = user_id);

create policy "campaigns_insert_own" on public.campaigns
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "campaigns_update_own" on public.campaigns
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "campaigns_delete_own" on public.campaigns
  for delete to authenticated
  using (auth.uid() = user_id);

-- creatives: ownership derived from the parent campaign.
create policy "creatives_select_own" on public.creatives
  for select to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = creatives.campaign_id and c.user_id = auth.uid()
    )
  );

create policy "creatives_insert_own" on public.creatives
  for insert to authenticated
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = creatives.campaign_id and c.user_id = auth.uid()
    )
  );

create policy "creatives_update_own" on public.creatives
  for update to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = creatives.campaign_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = creatives.campaign_id and c.user_id = auth.uid()
    )
  );

create policy "creatives_delete_own" on public.creatives
  for delete to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = creatives.campaign_id and c.user_id = auth.uid()
    )
  );

-- credit_transactions: users may only READ their own ledger.
-- All writes happen through SECURITY DEFINER functions (signup bonus, spend),
-- so there is intentionally no insert/update/delete policy here.
create policy "credit_transactions_select_own" on public.credit_transactions
  for select to authenticated
  using (auth.uid() = user_id);

-- subscriptions: users may only READ their own. Writes happen server-side
-- (Polar webhooks via the service role, which bypasses RLS).
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (auth.uid() = user_id);
