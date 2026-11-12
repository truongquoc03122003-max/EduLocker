-- =============================================================================
-- EduLocker Phase 2 Migration: Core Marketplace, Auth Profiles, Storage & RLS
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Trigger function auto-updating updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =============================================================================
-- 2. REFERENCE TABLES: universities, majors, courses, categories, lockers
-- =============================================================================

create table if not exists public.universities (
  id text primary key,
  code text not null unique,
  name text not null,
  short_name text not null,
  email_domain text not null,
  city text not null default 'Cần Thơ',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.majors (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  code text not null,
  name text not null,
  faculty text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (university_id, code)
);

create index if not exists idx_majors_university_id on public.majors(university_id);

create table if not exists public.courses (
  id text primary key,
  major_id text not null references public.majors(id) on delete cascade,
  code text not null,
  name text not null,
  semester_hint text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (major_id, code)
);

create index if not exists idx_courses_major_id on public.courses(major_id);

create table if not exists public.categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon_name text not null default 'BookOpen',
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_categories_sort_order on public.categories(sort_order);

-- Vị trí Smart Locker đề xuất / mô phỏng (Demo)
create table if not exists public.locker_locations (
  id text primary key,
  code text not null unique,
  name text not null,
  campus_area text not null,
  address text not null,
  university_id text not null references public.universities(id) on delete cascade,
  operating_hours text not null,
  description text not null,
  total_compartments integer not null default 4 check (total_compartments >= 0),
  available_compartments integer not null default 4 check (available_compartments >= 0),
  is_demo_station boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.locker_compartments (
  id text primary key,
  locker_id text not null references public.locker_locations(id) on delete cascade,
  code text not null,
  size text not null check (size in ('S', 'M', 'L')),
  size_label text not null,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE')),
  current_order_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (locker_id, code)
);

create index if not exists idx_locker_compartments_locker_id on public.locker_compartments(locker_id);

-- =============================================================================
-- 3. PROFILES (Linked 1-1 with auth.users, NO public email column)
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  university_id text not null default 'uni-ctu' references public.universities(id),
  major_id text not null references public.majors(id),
  cohort text not null default 'K50',
  bio text,
  email_verified boolean not null default false,
  campus_verified boolean not null default false,
  rating_avg numeric(3,2) not null default 5.00 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  completed_transactions integer not null default 0 check (completed_transactions >= 0),
  eco_points integer not null default 0 check (eco_points >= 0),
  role text not null default 'student' check (role in ('student', 'moderator', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_university_major on public.profiles(university_id, major_id);

-- Validate University -> Major hierarchy integrity on profiles
create or replace function public.validate_profile_academic_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.majors m
    where m.id = new.major_id
      and m.university_id = new.university_id
  ) then
    raise exception 'Khoa/Ngành (%) không thuộc trường đại học (%) đã chọn.', new.major_id, new.university_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_profile_academic_integrity on public.profiles;
create trigger trg_validate_profile_academic_integrity
before insert or update of university_id, major_id on public.profiles
for each row
execute function public.validate_profile_academic_integrity();

-- Guardrail: Prevent privilege escalation or tampering with system fields on INSERT and UPDATE
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_trusted_sync boolean;
  v_is_client_context boolean;
begin
  v_is_trusted_sync := coalesce(current_setting('edulocker.trusted_auth_sync', true), '') = 'true';
  v_is_client_context := (
    auth.uid() is not null
    or coalesce(auth.role(), '') in ('authenticated', 'anon')
    or current_user in ('authenticated', 'anon')
  );

  if not v_is_trusted_sync and v_is_client_context then
    if tg_op = 'INSERT' then
      if new.role <> 'student'
         or new.campus_verified <> false
         or new.email_verified <> false
         or new.rating_avg <> 5.00
         or new.rating_count <> 0
         or new.completed_transactions <> 0
         or new.eco_points <> 0
      then
        raise exception 'Không được phép tự thiết lập các trường đặc quyền hệ thống khi tạo hồ sơ.'
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.role is distinct from old.role
         or new.campus_verified is distinct from old.campus_verified
         or new.email_verified is distinct from old.email_verified
         or new.rating_avg is distinct from old.rating_avg
         or new.rating_count is distinct from old.rating_count
         or new.completed_transactions is distinct from old.completed_transactions
         or new.eco_points is distinct from old.eco_points
      then
        raise exception 'Không được phép chỉnh sửa các trường hệ thống (role, campus_verified, email_verified, rating, eco_points).'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_fields on public.profiles;
create trigger trg_protect_profile_privileged_fields
before insert or update on public.profiles
for each row
execute function public.protect_profile_privileged_fields();

-- Auto-create/sync profile when auth.users is created or email is confirmed
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_university_id text;
  v_major_id text;
  v_cohort text;
begin
  perform set_config('edulocker.trusted_auth_sync', 'true', true);

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(new.email, 'Sinh viên'), '@', 1)
  );
  v_university_id := coalesce(
    nullif(trim(new.raw_user_meta_data->>'university_id'), ''),
    'uni-ctu'
  );
  v_major_id := nullif(trim(new.raw_user_meta_data->>'major_id'), '');
  v_cohort := coalesce(
    nullif(trim(new.raw_user_meta_data->>'cohort'), ''),
    'K50'
  );

  if not exists (select 1 from public.universities where id = v_university_id) then
    raise exception 'Trường đại học (%) không tồn tại.', v_university_id
      using errcode = '23514';
  end if;

  -- Chỉ mặc định major-cntt khi trường là uni-ctu và người dùng chưa truyền major_id
  if v_major_id is null and v_university_id = 'uni-ctu' then
    v_major_id := 'major-cntt';
  end if;

  if v_major_id is null or not exists (
    select 1 from public.majors m
    where m.id = v_major_id
      and m.university_id = v_university_id
  ) then
    raise exception 'Khoa/Ngành (%) không hợp lệ hoặc không thuộc trường (%).', coalesce(v_major_id, 'NULL'), v_university_id
      using errcode = '23514';
  end if;

  insert into public.profiles (
    id,
    full_name,
    university_id,
    major_id,
    cohort,
    email_verified,
    campus_verified,
    role
  )
  values (
    new.id,
    v_full_name,
    v_university_id,
    v_major_id,
    v_cohort,
    (new.email_confirmed_at is not null),
    false,
    'student'
  )
  on conflict (id) do update
  set
    email_verified = (new.email_confirmed_at is not null),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_or_updated on auth.users;
create trigger on_auth_user_created_or_updated
after insert or update of email_confirmed_at, raw_user_meta_data on auth.users
for each row
execute function public.handle_auth_user_sync();

-- =============================================================================
-- 4. PRODUCTS, PRODUCT_IMAGES, FAVORITES
-- =============================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 10 and 120),
  slug text not null unique,
  description text not null check (char_length(trim(description)) between 25 and 2000),
  highlights text[] not null default '{}',
  category_id text not null references public.categories(id),
  condition text not null check (condition in ('LIKE_NEW', 'GOOD', 'FAIR', 'WELL_USED')),
  condition_percent integer not null default 90 check (condition_percent between 50 and 100),
  price integer not null check (price >= 0 and price <= 20000000),
  original_price integer check (original_price is null or original_price >= price),
  university_id text not null references public.universities(id),
  major_id text not null references public.majors(id),
  course_id text references public.courses(id) on delete set null,
  cohort text not null,
  preferred_locker_id text references public.locker_locations(id) on delete set null,
  delivery_method text not null default 'SMART_LOCKER' check (delivery_method in ('SMART_LOCKER', 'CAMPUS_MEETUP')),
  status text not null default 'AVAILABLE' check (status in ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN')),
  view_count integer not null default 0 check (view_count >= 0),
  favorite_count integer not null default 0 check (favorite_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Validate University -> Major -> Course hierarchy integrity on products
create or replace function public.validate_product_academic_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.majors m
    where m.id = new.major_id
      and m.university_id = new.university_id
  ) then
    raise exception 'Khoa/Ngành (%) không thuộc trường đại học (%) của sản phẩm.', new.major_id, new.university_id
      using errcode = '23514';
  end if;

  if new.course_id is not null and not exists (
    select 1 from public.courses c
    where c.id = new.course_id
      and c.major_id = new.major_id
  ) then
    raise exception 'Môn học (%) không thuộc Khoa/Ngành (%) đã chọn.', new.course_id, new.major_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_product_academic_integrity on public.products;
create trigger trg_validate_product_academic_integrity
before insert or update of university_id, major_id, course_id on public.products
for each row
execute function public.validate_product_academic_integrity();

create index if not exists idx_products_status_created_at on public.products(status, created_at desc);
create index if not exists idx_products_seller_id on public.products(seller_id);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_academic on public.products(university_id, major_id, course_id, cohort);
create index if not exists idx_products_price on public.products(price);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_text text not null,
  display_order integer not null default 1 check (display_order between 1 and 5),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_product_images_product_id on public.product_images(product_id, display_order);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, product_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_product_id on public.favorites(product_id);

-- Updated_at triggers
drop trigger if exists trg_universities_updated_at on public.universities;
create trigger trg_universities_updated_at before update on public.universities for each row execute function public.set_updated_at();

drop trigger if exists trg_majors_updated_at on public.majors;
create trigger trg_majors_updated_at before update on public.majors for each row execute function public.set_updated_at();

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at before update on public.courses for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists trg_locker_locations_updated_at on public.locker_locations;
create trigger trg_locker_locations_updated_at before update on public.locker_locations for each row execute function public.set_updated_at();

drop trigger if exists trg_locker_compartments_updated_at on public.locker_compartments;
create trigger trg_locker_compartments_updated_at before update on public.locker_compartments for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

alter table public.universities enable row level security;
alter table public.majors enable row level security;
alter table public.courses enable row level security;
alter table public.categories enable row level security;
alter table public.locker_locations enable row level security;
alter table public.locker_compartments enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favorites enable row level security;

-- Reference data: readable by everyone
create policy "universities_public_read" on public.universities for select using (true);
create policy "majors_public_read" on public.majors for select using (true);
create policy "courses_public_read" on public.courses for select using (true);
create policy "categories_public_read" on public.categories for select using (true);
create policy "locker_locations_public_read" on public.locker_locations for select using (true);
create policy "locker_compartments_public_read" on public.locker_compartments for select using (true);

-- Profiles: public read (email column removed so email is never exposed), locked-down owner insert/update
create policy "profiles_public_read" on public.profiles
  for select using (true);

create policy "profiles_owner_insert" on public.profiles
  for insert to authenticated
  with check (
    auth.uid() = id
    and role = 'student'
    and campus_verified = false
    and email_verified = false
    and rating_avg = 5.00
    and rating_count = 0
    and completed_transactions = 0
    and eco_points = 0
  );

create policy "profiles_owner_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Products: public can view AVAILABLE products; owner can view/insert/update/delete their own products
create policy "products_select_available_or_own" on public.products
  for select
  using (status = 'AVAILABLE' or auth.uid() = seller_id);

create policy "products_insert_own" on public.products
  for insert to authenticated
  with check (auth.uid() = seller_id);

create policy "products_update_own" on public.products
  for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create policy "products_delete_own" on public.products
  for delete to authenticated
  using (auth.uid() = seller_id);

-- Product images: tied to parent product ownership
create policy "product_images_select_public_or_own" on public.product_images
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.status = 'AVAILABLE' or p.seller_id = auth.uid())
    )
  );

create policy "product_images_insert_own" on public.product_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = auth.uid()
    )
  );

create policy "product_images_update_own" on public.product_images
  for update to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = auth.uid()
    )
  );

create policy "product_images_delete_own" on public.product_images
  for delete to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = auth.uid()
    )
  );

-- Favorites: private per user
create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (auth.uid() = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 6. STORAGE BUCKET & RLS: product-images (Max 5MB, JPG/JPEG/PNG/WEBP)
--    Path format: {user_id}/{product_id}/{filename}
--    Enforces both folder[1] = auth.uid() AND folder[2] belongs to seller's product
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_storage_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products p
      where p.id::text = (storage.foldername(name))[2]
        and p.seller_id = auth.uid()
    )
  );

create policy "product_images_storage_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products p
      where p.id::text = (storage.foldername(name))[2]
        and p.seller_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products p
      where p.id::text = (storage.foldername(name))[2]
        and p.seller_id = auth.uid()
    )
  );

create policy "product_images_storage_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.products p
        where p.id::text = (storage.foldername(name))[2]
          and p.seller_id = auth.uid()
      )
    )
  );
