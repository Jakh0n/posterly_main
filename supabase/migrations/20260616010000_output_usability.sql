-- Posterly output usability: variant favorite / selection on campaigns.

alter table public.campaigns
  add column if not exists favorite_creative_id uuid
  references public.creatives (id) on delete set null;

create index if not exists campaigns_favorite_creative_id_idx
  on public.campaigns (favorite_creative_id)
  where favorite_creative_id is not null;
