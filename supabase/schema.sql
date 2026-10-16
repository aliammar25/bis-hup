-- BIS Hub schema — run in Supabase Dashboard > SQL Editor
-- Access model: anyone with the link can READ; only admins can WRITE.

create table public.subjects (
  id bigint generated always as identity primary key,
  name text not null,
  code text,
  doctor_name text,
  description text,
  created_at timestamptz not null default now()
);

create table public.lectures (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  title text not null,
  week_number int not null default 1,
  file_url text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  file_url text,
  created_at timestamptz not null default now()
);

create table public.timetable (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  location text
);

create index on public.lectures(subject_id);
create index on public.tasks(subject_id, due_date);
create index on public.timetable(subject_id);

-- Profiles: one row per auth user; role is 'student' by default
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','admin')),
  display_name text
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role) values (new.id, 'student');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check lives in the database, not in React
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- RLS
alter table public.subjects  enable row level security;
alter table public.lectures  enable row level security;
alter table public.tasks     enable row level security;
alter table public.timetable enable row level security;
alter table public.profiles  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['subjects','lectures','tasks','timetable'] loop
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert with check (public.is_admin())', t);
    execute format('create policy "admin update" on public.%I for update using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admin delete" on public.%I for delete using (public.is_admin())', t);
  end loop;
end $$;

-- Users can read only their own profile; no client-side writes (nobody can promote themselves)
create policy "read own profile" on public.profiles for select using (id = auth.uid());

-- Storage: public bucket for lecture/task files, admin-only upload
insert into storage.buckets (id, name, public) values ('files', 'files', true)
  on conflict (id) do nothing;

create policy "files admin insert" on storage.objects for insert
  with check (bucket_id = 'files' and public.is_admin());
create policy "files admin update" on storage.objects for update
  using (bucket_id = 'files' and public.is_admin());
create policy "files admin delete" on storage.objects for delete
  using (bucket_id = 'files' and public.is_admin());
-- (public bucket => files are readable by URL, matching the "anyone with the link" decision)

-- After you sign up with your admin email once, promote yourself (SQL Editor only):
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'YOUR_EMAIL');
