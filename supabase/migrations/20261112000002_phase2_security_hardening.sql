-- =============================================================================
-- EduLocker Phase 2 Security Hardening Follow-up Migration (Idempotent)
-- Safe to run on top of an already-applied 20261112000001 migration
-- =============================================================================

-- 1. Remove public email column from profiles (Privacy fix)
alter table public.profiles drop column if exists email;

-- 2. Remove blind default 'major-cntt' from profiles.major_id
alter table public.profiles alter column major_id drop default;

-- 3. Enforce University -> Major integrity on profiles and products
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

-- 4. Harden profile privilege protection on both INSERT and UPDATE
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

drop policy if exists "profiles_owner_insert" on public.profiles;
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

-- 5. Update auth trigger so it never writes email to public.profiles and validates university-major
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

-- 6. Harden Storage ownership policies to verify product_id in folder[2] belongs to auth.uid()
drop policy if exists "product_images_storage_owner_insert" on storage.objects;
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

drop policy if exists "product_images_storage_owner_update" on storage.objects;
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

drop policy if exists "product_images_storage_owner_delete" on storage.objects;
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

