-- ============================================================
-- SMART ATTENDANCE TRACKER - SUPABASE DATABASE SCHEMA
-- ============================================================

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text not null default 'Student',
  attendance_requirement integer not null default 80,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SUBJECTS TABLE
create table if not exists public.subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subject_name text not null,
  color text not null default '#4ade80',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TIMETABLE TABLE
create table if not exists public.timetable (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  day_of_week text not null check (day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time text not null,
  end_time text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ATTENDANCE RECORDS TABLE
create table if not exists public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(subject_id, date)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.timetable enable row level security;
alter table public.attendance_records enable row level security;

-- USERS policies
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- SUBJECTS policies
create policy "Users can view own subjects" on public.subjects
  for select using (auth.uid() = user_id);

create policy "Users can insert own subjects" on public.subjects
  for insert with check (auth.uid() = user_id);

create policy "Users can update own subjects" on public.subjects
  for update using (auth.uid() = user_id);

create policy "Users can delete own subjects" on public.subjects
  for delete using (auth.uid() = user_id);

-- TIMETABLE policies
create policy "Users can view own timetable" on public.timetable
  for select using (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );

create policy "Users can insert own timetable" on public.timetable
  for insert with check (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );

create policy "Users can delete own timetable" on public.timetable
  for delete using (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );

-- ATTENDANCE RECORDS policies
create policy "Users can view own records" on public.attendance_records
  for select using (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );

create policy "Users can insert own records" on public.attendance_records
  for insert with check (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );

create policy "Users can update own records" on public.attendance_records
  for update using (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );

create policy "Users can delete own records" on public.attendance_records
  for delete using (
    auth.uid() = (select user_id from public.subjects where id = subject_id)
  );