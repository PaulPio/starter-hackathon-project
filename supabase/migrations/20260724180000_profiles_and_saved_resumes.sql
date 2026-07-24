-- Profiles for OAuth users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can select own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- One cached resume session per user
create table public.saved_resumes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null,
  resume_text text not null,
  step text not null default 'profile'
    check (step in ('profile', 'jobs')),
  updated_at timestamptz not null default now()
);

alter table public.saved_resumes enable row level security;

create policy "Users can select own saved resume"
  on public.saved_resumes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own saved resume"
  on public.saved_resumes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own saved resume"
  on public.saved_resumes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own saved resume"
  on public.saved_resumes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-create profile on signup (trigger-only; revoke public execute below)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_name text;
begin
  select i.provider
    into provider_name
  from auth.identities i
  where i.user_id = new.id
  order by i.created_at asc
  limit 1;

  if provider_name is null then
    provider_name := coalesce(new.raw_app_meta_data->>'provider', 'oauth');
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    provider_name
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    provider = coalesce(excluded.provider, public.profiles.provider),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
