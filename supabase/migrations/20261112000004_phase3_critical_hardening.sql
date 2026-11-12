-- =============================================================================
-- EduLocker Phase 3 Critical Hardening (follow-up migration – does NOT modify
-- 20261112000003_phase3_orders_lockers_otp_payment.sql which is already applied)
--
-- 1. Tách OTP expiration khỏi Order/Pickup expiration:
--    - rpc_seller_dropoff KHÔNG còn đặt orders.expires_at = thời điểm OTP hết hạn.
--    - READY_FOR_PICKUP (và mọi trạng thái sau khi hàng đã nằm trong tủ) KHÔNG
--      còn được auto-expire → không bao giờ tự giải phóng ngăn tủ / sản phẩm.
-- 2. Thêm rpc_regenerate_locker_otp (chỉ buyer) + event OTP_REGENERATED.
-- 3. Demo Mode kiểm soát ở DATABASE level (app_runtime_settings.demo_mode).
-- 4. Harden EXECUTE privileges: không cho PUBLIC/anon gọi RPC giao dịch;
--    rpc_expire_order_if_needed chỉ cho buyer/seller của đơn.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ORDER_EVENTS: thêm event OTP_REGENERATED
-- -----------------------------------------------------------------------------
alter table public.order_events drop constraint if exists order_events_event_type_check;
alter table public.order_events add constraint order_events_event_type_check check (
  event_type in (
    'ORDER_CREATED',
    'SELLER_CONFIRMED',
    'LOCKER_RESERVED',
    'ITEM_DROPPED_OFF',
    'OTP_GENERATED',
    'OTP_REGENERATED',
    'LOCKER_UNLOCKED',
    'ITEM_PICKED_UP',
    'ORDER_COMPLETED',
    'ORDER_CANCELLED',
    'ORDER_EXPIRED',
    'DISPUTE_OPENED'
  )
);

-- -----------------------------------------------------------------------------
-- 2. SERVER/DATABASE-LEVEL DEMO MODE FLAG
--    Bảng không có policy nào + revoke toàn bộ quyền → client không đọc/sửa được.
--    Bật Demo Mode cho project trình diễn (chạy trong SQL Editor):
--      update public.app_runtime_settings set bool_value = true where key = 'demo_mode';
-- -----------------------------------------------------------------------------
create table if not exists public.app_runtime_settings (
  key text primary key,
  bool_value boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_runtime_settings enable row level security;
revoke all on table public.app_runtime_settings from public, anon, authenticated;

-- Secure-by-default: Demo Mode TẮT cho tới khi quản trị viên bật tường minh
insert into public.app_runtime_settings (key, bool_value)
values ('demo_mode', false)
on conflict (key) do nothing;

create or replace function public.is_demo_mode_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select bool_value from public.app_runtime_settings where key = 'demo_mode'),
    false
  );
$$;

revoke all on function public.is_demo_mode_enabled() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. INTERNAL EXPIRATION (không expose cho client)
--    Chỉ các trạng thái TRƯỚC khi người bán gửi hàng mới được auto-expire.
-- -----------------------------------------------------------------------------
create or replace function public.expire_order_internal(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('expired', false, 'reason', 'NOT_FOUND');
  end if;

  -- READY_FOR_PICKUP / IN_LOCKER / PICKED_UP... KHÔNG nằm trong danh sách:
  -- sau khi hàng đã nằm trong tủ, không bao giờ tự giải phóng ngăn tủ hay sản phẩm.
  if v_order.status in ('PENDING', 'SELLER_CONFIRMED', 'AWAITING_DROPOFF')
     and v_order.expires_at is not null
     and v_order.expires_at <= timezone('utc', now()) then

    perform set_config('edulocker.trusted_order_rpc', 'true', true);

    update public.orders
    set
      status = 'EXPIRED',
      updated_at = timezone('utc', now())
    where id = p_order_id;

    update public.products
    set
      status = 'AVAILABLE',
      updated_at = timezone('utc', now())
    where id = v_order.product_id
      and status = 'RESERVED';

    -- Ở các trạng thái trước drop-off, ngăn tủ tối đa chỉ ở RESERVED (chưa có hàng)
    if v_order.locker_compartment_id is not null then
      update public.locker_compartments
      set
        status = 'AVAILABLE',
        current_order_id = null,
        current_order_code = null,
        updated_at = timezone('utc', now())
      where id = v_order.locker_compartment_id
        and status = 'RESERVED';

      perform public.sync_locker_available_count(v_order.locker_location_id);
    end if;

    update public.locker_reservations
    set
      status = 'EXPIRED',
      released_at = timezone('utc', now())
    where order_id = p_order_id
      and status = 'ACTIVE';

    update public.locker_access_tokens
    set revoked_at = timezone('utc', now())
    where order_id = p_order_id
      and revoked_at is null
      and used_at is null;

    update public.payment_records
    set
      status = 'REFUNDED_DEMO',
      refunded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where order_id = p_order_id
      and status = 'HELD_DEMO';

    insert into public.order_events (
      order_id, actor_id, event_type, previous_status, new_status, metadata
    ) values (
      p_order_id,
      null,
      'ORDER_EXPIRED',
      v_order.status,
      'EXPIRED',
      jsonb_build_object(
        'expired_at', timezone('utc', now()),
        'payment_status', 'REFUNDED_DEMO'
      )
    );

    return jsonb_build_object('expired', true, 'status', 'EXPIRED');
  end if;

  return jsonb_build_object('expired', false, 'status', v_order.status);
end;
$$;

revoke all on function public.expire_order_internal(uuid) from public, anon, authenticated;

-- Public wrapper: chỉ buyer/seller của đơn được trigger kiểm tra hết hạn
create or replace function public.rpc_expire_order_if_needed(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_buyer_id uuid;
  v_seller_id uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  select buyer_id, seller_id into v_buyer_id, v_seller_id
  from public.orders
  where id = p_order_id;

  -- Không phân biệt "không tồn tại" và "không có quyền" để tránh dò ID đơn hàng
  if not found or (v_actor_id <> v_buyer_id and v_actor_id <> v_seller_id) then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  return public.expire_order_internal(p_order_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. DATA FIX: các đơn đã nằm trong tủ không còn hạn auto-expire
-- -----------------------------------------------------------------------------
update public.orders
set
  expires_at = null,
  updated_at = timezone('utc', now())
where status in ('IN_LOCKER', 'READY_FOR_PICKUP');

-- -----------------------------------------------------------------------------
-- 5. SELLER DROP-OFF: OTP TTL 30 phút nhưng KHÔNG gắn vào orders.expires_at
-- -----------------------------------------------------------------------------
create or replace function public.rpc_seller_dropoff(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_comp public.locker_compartments%rowtype;
  v_token_id uuid;
  v_otp_code text;
  v_token_hash text;
  v_otp_expires_at timestamptz;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  perform public.rpc_expire_order_if_needed(p_order_id);

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_order.seller_id <> v_actor_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status = 'EXPIRED' then
    raise exception 'Đơn hàng đã hết hạn.' using errcode = '23514';
  end if;

  if v_order.status <> 'AWAITING_DROPOFF' then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  select * into v_comp
  from public.locker_compartments
  where id = v_order.locker_compartment_id
  for update;

  if not found or v_comp.status <> 'RESERVED' then
    raise exception 'Ngăn tủ không ở trạng thái chờ gửi hàng (RESERVED).' using errcode = '23514';
  end if;

  -- 1. Compartment RESERVED -> OCCUPIED
  update public.locker_compartments
  set
    status = 'OCCUPIED',
    updated_at = timezone('utc', now())
  where id = v_comp.id;

  update public.locker_reservations
  set status = 'USED'
  where order_id = p_order_id
    and status = 'ACTIVE';

  -- 2. Revoke old tokens & generate new hashed 6-digit OTP (TTL 30m, max_attempts 5)
  update public.locker_access_tokens
  set revoked_at = timezone('utc', now())
  where order_id = p_order_id
    and revoked_at is null
    and used_at is null;

  v_token_id := gen_random_uuid();
  v_otp_code := public.derive_internal_otp_code(v_token_id, p_order_id);
  v_token_hash := public.hash_locker_otp(p_order_id, v_otp_code);
  v_otp_expires_at := timezone('utc', now()) + interval '30 minutes';

  insert into public.locker_access_tokens (
    id, order_id, compartment_id, token_hash, expires_at, attempt_count, max_attempts
  ) values (
    v_token_id, p_order_id, v_comp.id, v_token_hash, v_otp_expires_at, 0, 5
  );

  -- 3. Order AWAITING_DROPOFF -> IN_LOCKER -> READY_FOR_PICKUP
  --    expires_at = NULL: hết hạn OTP KHÔNG làm đơn hết hạn (pickup timeout xử lý ở Phase 4)
  update public.orders
  set
    status = 'READY_FOR_PICKUP',
    dropped_off_at = timezone('utc', now()),
    ready_for_pickup_at = timezone('utc', now()),
    expires_at = null,
    updated_at = timezone('utc', now())
  where id = p_order_id;

  insert into public.order_events (
    order_id, actor_id, event_type, previous_status, new_status, metadata
  ) values (
    p_order_id,
    v_actor_id,
    'ITEM_DROPPED_OFF',
    'AWAITING_DROPOFF',
    'IN_LOCKER',
    jsonb_build_object(
      'compartment_id', v_comp.id,
      'compartment_code', v_comp.code
    )
  );

  -- Không lưu OTP plaintext trong metadata
  insert into public.order_events (
    order_id, actor_id, event_type, previous_status, new_status, metadata
  ) values (
    p_order_id,
    null,
    'OTP_GENERATED',
    'IN_LOCKER',
    'READY_FOR_PICKUP',
    jsonb_build_object(
      'issue_type', 'INITIAL',
      'compartment_code', v_comp.code,
      'ttl_minutes', 30,
      'max_attempts', 5,
      'expires_at', v_otp_expires_at
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'READY_FOR_PICKUP',
    'compartment_code', v_comp.code,
    'otp_expires_at', v_otp_expires_at
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. DEMO OTP DELIVERY: chỉ trả OTP khi DATABASE xác nhận Demo Mode đang bật
-- -----------------------------------------------------------------------------
create or replace function public.rpc_get_buyer_demo_otp(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_token public.locker_access_tokens%rowtype;
  v_otp_code text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if not public.is_demo_mode_enabled() then
    return jsonb_build_object('available', false, 'reason', 'DEMO_MODE_DISABLED');
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id;

  if not found or v_order.buyer_id <> v_actor_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status <> 'READY_FOR_PICKUP' then
    return jsonb_build_object('available', false, 'reason', 'NOT_READY');
  end if;

  select * into v_token
  from public.locker_access_tokens
  where order_id = p_order_id
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('available', false, 'reason', 'NO_TOKEN');
  end if;

  if v_token.used_at is not null then
    return jsonb_build_object(
      'available', false,
      'unlocked', true,
      'reason', 'ALREADY_USED',
      'attempt_count', v_token.attempt_count,
      'max_attempts', v_token.max_attempts
    );
  end if;

  if v_token.revoked_at is not null or v_token.attempt_count >= v_token.max_attempts then
    return jsonb_build_object(
      'available', false,
      'unlocked', false,
      'reason', 'REVOKED',
      'attempt_count', v_token.attempt_count,
      'max_attempts', v_token.max_attempts
    );
  end if;

  if v_token.expires_at <= timezone('utc', now()) then
    return jsonb_build_object(
      'available', false,
      'unlocked', false,
      'reason', 'EXPIRED',
      'expires_at', v_token.expires_at
    );
  end if;

  v_otp_code := public.derive_internal_otp_code(v_token.id, p_order_id);

  return jsonb_build_object(
    'available', true,
    'unlocked', false,
    'demo_otp', v_otp_code,
    'expires_at', v_token.expires_at,
    'attempt_count', v_token.attempt_count,
    'max_attempts', v_token.max_attempts
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. REGENERATE LOCKER OTP (BUYER ONLY) – không đổi trạng thái order/product/locker/payment
-- -----------------------------------------------------------------------------
create or replace function public.rpc_regenerate_locker_otp(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_comp public.locker_compartments%rowtype;
  v_old public.locker_access_tokens%rowtype;
  v_previous_reason text;
  v_token_id uuid;
  v_otp_expires_at timestamptz;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.buyer_id <> v_actor_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status <> 'READY_FOR_PICKUP' then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  select * into v_comp
  from public.locker_compartments
  where id = v_order.locker_compartment_id
  for update;

  if not found or v_comp.status <> 'OCCUPIED' then
    raise exception 'Ngăn tủ không còn chứa sản phẩm của đơn hàng này.' using errcode = '23514';
  end if;

  select * into v_old
  from public.locker_access_tokens
  where order_id = p_order_id
  order by created_at desc
  limit 1
  for update;

  if found then
    if v_old.used_at is not null then
      raise exception 'Ngăn tủ đã được mở bằng mã OTP. Vui lòng xác nhận lấy hàng.' using errcode = '23514';
    end if;

    if v_old.revoked_at is not null then
      v_previous_reason := 'REVOKED';
    elsif v_old.attempt_count >= v_old.max_attempts then
      v_previous_reason := 'MAX_ATTEMPTS';
    elsif v_old.expires_at <= timezone('utc', now()) then
      v_previous_reason := 'EXPIRED';
    else
      raise exception 'Mã OTP hiện tại vẫn còn hiệu lực.' using errcode = '23514';
    end if;
  else
    v_previous_reason := 'NO_TOKEN';
  end if;

  -- 1. Revoke mọi token cũ chưa dùng
  update public.locker_access_tokens
  set revoked_at = timezone('utc', now())
  where order_id = p_order_id
    and revoked_at is null
    and used_at is null;

  -- 2-6. Token mới: OTP 6 số mới, TTL 30 phút, attempt_count = 0, max_attempts = 5
  v_token_id := gen_random_uuid();
  v_otp_expires_at := timezone('utc', now()) + interval '30 minutes';

  insert into public.locker_access_tokens (
    id, order_id, compartment_id, token_hash, expires_at, attempt_count, max_attempts
  ) values (
    v_token_id,
    p_order_id,
    v_comp.id,
    public.hash_locker_otp(p_order_id, public.derive_internal_otp_code(v_token_id, p_order_id)),
    v_otp_expires_at,
    0,
    5
  );

  -- 7. Event (không lưu OTP plaintext)
  insert into public.order_events (
    order_id, actor_id, event_type, previous_status, new_status, metadata
  ) values (
    p_order_id,
    v_actor_id,
    'OTP_REGENERATED',
    'READY_FOR_PICKUP',
    'READY_FOR_PICKUP',
    jsonb_build_object(
      'issue_type', 'REGENERATED',
      'previous_token_reason', v_previous_reason,
      'compartment_code', v_comp.code,
      'ttl_minutes', 30,
      'max_attempts', 5,
      'expires_at', v_otp_expires_at
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'READY_FOR_PICKUP',
    'otp_expires_at', v_otp_expires_at,
    'attempt_count', 0,
    'max_attempts', 5
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. EXECUTE PRIVILEGES HARDENING
--    Supabase mặc định grant EXECUTE cho anon/authenticated qua default privileges,
--    nên phải revoke tường minh khỏi cả PUBLIC và anon.
-- -----------------------------------------------------------------------------
revoke all on function public.rpc_create_order(uuid, text) from public, anon;
revoke all on function public.rpc_seller_confirm_order(uuid, text) from public, anon;
revoke all on function public.rpc_seller_dropoff(uuid) from public, anon;
revoke all on function public.rpc_verify_locker_otp(uuid, text) from public, anon;
revoke all on function public.rpc_confirm_pickup(uuid) from public, anon;
revoke all on function public.rpc_complete_order(uuid) from public, anon;
revoke all on function public.rpc_cancel_order(uuid, text) from public, anon;
revoke all on function public.rpc_open_dispute(uuid, text) from public, anon;
revoke all on function public.rpc_expire_order_if_needed(uuid) from public, anon;
revoke all on function public.rpc_get_buyer_demo_otp(uuid) from public, anon;
revoke all on function public.rpc_regenerate_locker_otp(uuid) from public, anon;

grant execute on function public.rpc_create_order(uuid, text) to authenticated;
grant execute on function public.rpc_seller_confirm_order(uuid, text) to authenticated;
grant execute on function public.rpc_seller_dropoff(uuid) to authenticated;
grant execute on function public.rpc_verify_locker_otp(uuid, text) to authenticated;
grant execute on function public.rpc_confirm_pickup(uuid) to authenticated;
grant execute on function public.rpc_complete_order(uuid) to authenticated;
grant execute on function public.rpc_cancel_order(uuid, text) to authenticated;
grant execute on function public.rpc_open_dispute(uuid, text) to authenticated;
grant execute on function public.rpc_expire_order_if_needed(uuid) to authenticated;
grant execute on function public.rpc_get_buyer_demo_otp(uuid) to authenticated;
grant execute on function public.rpc_regenerate_locker_otp(uuid) to authenticated;

-- Internal helpers: không ai ngoài các RPC SECURITY DEFINER được gọi
revoke all on function public.sync_locker_available_count(text) from public, anon, authenticated;
revoke all on function public.derive_internal_otp_code(uuid, uuid) from public, anon, authenticated;
revoke all on function public.hash_locker_otp(uuid, text) from public, anon, authenticated;
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'protect_product_order_lock'
  ) then
    execute 'revoke all on function public.protect_product_order_lock() from public, anon, authenticated';
  end if;
end;
$$;
