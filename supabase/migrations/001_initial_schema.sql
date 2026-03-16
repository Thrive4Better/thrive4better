-- 1. profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'staff',
  created_at timestamptz default now()
);

-- 2. clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  ndis_number text not null,
  address text,
  suburb text,
  postcode text,
  phone text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  preferred_communication text check (preferred_communication in ('phone','email','text')),
  funding_type text check (funding_type in ('Agency Managed','Plan Managed','Self Managed')),
  plan_start_date date,
  plan_end_date date,
  plan_manager_name text,
  plan_manager_email text,
  plan_manager_phone text,
  support_coordinator_name text,
  support_coordinator_contact text,
  status text default 'Active' check (status in ('Active','Inactive','On Hold')),
  notes text,
  created_at timestamptz default now()
);

-- 3. client_support_categories
create table if not exists client_support_categories (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  category_name text not null,
  allocated_budget numeric(12,2) default 0,
  spent_amount numeric(12,2) default 0
);

-- 4. care_plans
create table if not exists care_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  support_needs_summary text,
  preferred_routines text,
  likes_and_preferences text,
  communication_needs text,
  risk_notes text,
  medical_info text,
  last_reviewed_date date,
  next_review_due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. care_plan_goals
create table if not exists care_plan_goals (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references care_plans(id) on delete cascade,
  description text not null,
  target_date date,
  status text default 'Not Started' check (status in ('Not Started','In Progress','Achieved'))
);

-- 6. allied_health_contacts
create table if not exists allied_health_contacts (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references care_plans(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text
);

-- 7. carers
create table if not exists carers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  role text,
  qualifications text[] default '{}',
  availability text[] default '{}',
  status text default 'Active' check (status in ('Active','Unavailable','On Leave')),
  notes text,
  created_at timestamptz default now()
);

-- 8. shifts
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  carer_id uuid not null references carers(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  service_type text not null,
  support_category text,
  ndis_line_item_code text,
  hourly_rate numeric(8,2),
  total_amount numeric(10,2),
  hours numeric(6,2),
  notes text,
  status text default 'Scheduled' check (status in ('Scheduled','Confirmed','In Progress','Completed','Cancelled')),
  convert_to_invoice boolean default false,
  created_at timestamptz default now()
);

-- 9. invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references clients(id) on delete cascade,
  invoice_date date not null,
  due_date date not null,
  period_start date,
  period_end date,
  reference_number text,
  notes_to_client text,
  subtotal numeric(12,2) default 0,
  gst_applicable boolean default false,
  gst_amount numeric(10,2) default 0,
  total numeric(12,2) default 0,
  status text default 'Draft' check (status in ('Draft','Sent','Paid','Overdue')),
  created_at timestamptz default now()
);

-- 10. invoice_line_items
create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  date date,
  description text,
  ndis_line_item_code text,
  support_category text,
  hours numeric(6,2),
  rate numeric(8,2),
  amount numeric(10,2),
  shift_id uuid references shifts(id) on delete set null
);

-- 11. ndis_rates
create table if not exists ndis_rates (
  id uuid primary key default gen_random_uuid(),
  support_item_name text not null,
  line_item_code text not null,
  support_category text,
  unit text default 'Hour' check (unit in ('Hour','Each')),
  standard_rate numeric(8,2),
  evening_rate numeric(8,2),
  night_rate numeric(8,2),
  saturday_rate numeric(8,2),
  sunday_rate numeric(8,2),
  public_holiday_rate numeric(8,2)
);

-- 12. client_documents
create table if not exists client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  file_type text,
  upload_date timestamptz default now(),
  size text,
  storage_path text
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table clients enable row level security;
alter table client_support_categories enable row level security;
alter table care_plans enable row level security;
alter table care_plan_goals enable row level security;
alter table allied_health_contacts enable row level security;
alter table carers enable row level security;
alter table shifts enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table ndis_rates enable row level security;
alter table client_documents enable row level security;

-- RLS policies: authenticated users get full access
create policy "Authenticated full access" on profiles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on clients for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on client_support_categories for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on care_plans for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on care_plan_goals for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on allied_health_contacts for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on carers for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on shifts for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on invoices for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on invoice_line_items for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on ndis_rates for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on client_documents for all using (auth.role() = 'authenticated');
