-- =============================================================================
-- EduLocker Phase 4 Security Hotfix:
-- Fix protect_profile_privileged_fields() trigger where SECURITY DEFINER caused
-- current_user to always evaluate to 'postgres', bypassing role/status checks.
-- =============================================================================

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trusted_sync text := current_setting('edulocker.trusted_auth_sync', true);
  v_jwt_role text := coalesce(auth.role(), '');
  v_uid uuid := auth.uid();
begin
  -- Chỉ bypass khi được gọi từ trusted RPC/trigger nội bộ (set_config),
  -- từ Supabase service_role JWT, hoặc thao tác trực tiếp trong SQL Editor (không có JWT/auth.uid).
  if v_trusted_sync = 'true'
     or v_jwt_role = 'service_role'
     or (v_uid is null and v_jwt_role = '' and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'student'
       or new.campus_verified is distinct from false
       or new.email_verified is distinct from false
       or new.rating_avg is distinct from 5.00
       or new.rating_count is distinct from 0
       or new.completed_transactions is distinct from 0
       or new.eco_points is distinct from 0
       or new.account_status is distinct from 'ACTIVE' then
      raise exception 'Không được phép tự thiết lập trường đặc quyền hệ thống khi tạo hồ sơ.' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       or new.campus_verified is distinct from old.campus_verified
       or new.email_verified is distinct from old.email_verified
       or new.rating_avg is distinct from old.rating_avg
       or new.rating_count is distinct from old.rating_count
       or new.completed_transactions is distinct from old.completed_transactions
       or new.eco_points is distinct from old.eco_points
       or new.account_status is distinct from old.account_status then
      raise exception 'Không được phép tự thay đổi quyền, trạng thái tài khoản, xác thực hoặc chỉ số uy tín.' using errcode = '42501';
    end if;
    return new;
  end if;

  return new;
end;
$$;

-- Reset non-admin test accounts back to 'student' (keep Admin D as 'admin')
do $$
begin
  perform set_config('edulocker.trusted_auth_sync', 'true', true);
  update public.profiles
  set role = 'student', account_status = 'ACTIVE'
  where id in (
    '31de8733-1993-4b3e-b323-351eca7ea3db', -- User A
    '5f1e3c8c-cde4-4f8b-bffc-2bef68a0c349', -- User B
    '9dd6dae5-d1a7-4cef-8ab8-7ef6c10e7766'  -- User C
  );
end;
$$;

