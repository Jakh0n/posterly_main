-- Reduce signup bonus from 5 to 3 credits for sustainable unit economics.

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
  values (new.id, 3, 'signup_bonus');

  return new;
end;
$$;
