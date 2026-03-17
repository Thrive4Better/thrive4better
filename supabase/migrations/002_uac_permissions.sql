-- Add UAC (User Access Control) columns to profiles table
-- is_active: controls whether user can log in (used alongside auth ban)
-- permissions: granular JSONB array of permission keys

alter table profiles add column if not exists is_active boolean default true;
alter table profiles add column if not exists permissions jsonb default null;

-- Add indexes for common queries
create index if not exists idx_profiles_is_active on profiles (is_active);
create index if not exists idx_profiles_role on profiles (role);

-- Update the handle_new_user trigger to set is_active = true by default
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, is_active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), true);
  return new;
end;
$$ language plpgsql security definer;
