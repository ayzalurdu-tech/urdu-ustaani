-- ============================================
-- SCHEMA.SQL
-- Run this in Supabase: Dashboard > SQL Editor > New Query > paste > Run
-- ============================================

-- STUDENTS
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  whatsapp text not null,
  country text not null,
  timezone text not null,
  age int not null,
  created_at timestamp with time zone default now()
);

-- BOOKINGS (added payment_status column)
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  urdu_level text not null,
  learning_purpose text not null,
  trial_type text not null,
  number_of_lessons text,
  price_agreement boolean not null default false,
  payment_status text not null default 'unpaid', -- 'unpaid' or 'paid'
  status text not null default 'pending',         -- pending / confirmed / completed / cancelled
  created_at timestamp with time zone default now()
);

-- CONTACT MESSAGES
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamp with time zone default now()
);

-- INDEXES
create index if not exists idx_bookings_student_id on bookings(student_id);
create index if not exists idx_students_email on students(email);

-- If you already have the bookings table, just add the new column:
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text not null default 'unpaid';
