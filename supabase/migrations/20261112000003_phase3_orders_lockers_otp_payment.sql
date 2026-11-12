-- =============================================================================
-- EduLocker Phase 3 Migration:
-- Transaction Flow + Smart Locker Reservations + OTP Access Tokens + Payment Simulator
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. UPDATE PRODUCTS SELECT POLICY FOR RESERVED / SOLD VISIBILITY
--    Allow public & buyers to view AVAILABLE, RESERVED, SOLD products
--    (while DRAFT and HIDDEN remain visible only to the seller)
-- -----------------------------------------------------------------------------
drop policy if exists "products_select_available_or_own" on public.products;
create policy "products_select_available_or_own" on public.products
  for select
  using (
    status in ('AVAILABLE', 'RESERVED', 'SOLD')
    or auth.uid() = seller_id
  );

drop policy if exists "product_images_select_public_or_own" on public.product_images;
create policy "product_images_select_public_or_own" on public.product_images
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (
          p.status in ('AVAILABLE', 'RESERVED', 'SOLD')
          or p.seller_id = auth.uid()
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 2. ORDERS TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  locker_location_id text references public.locker_locations(id) on delete set null,
  locker_compartment_id text references public.locker_compartments(id) on delete set null,
  status text not null default 'PENDING' check (
    status in (
      'PENDING',
      'SELLER_CONFIRMED',
      'AWAITING_DROPOFF',
      'IN_LOCKER',
      'READY_FOR_PICKUP',
      'PICKED_UP',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'DISPUTED',
      'RETURN_PENDING',
      'RETURNED'
    )
  ),
  product_price integer not null check (product_price >= 0),
  total_amount integer not null check (total_amount >= 0),
  dispute_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  seller_confirmed_at timestamptz,
  dropped_off_at timestamptz,
  ready_for_pickup_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  constraint orders_buyer_not_seller_check check (buyer_id <> seller_id)
);

-- Concurrency protection: at most ONE active order per single-item product
create unique index if not exists idx_orders_one_active_per_product
  on public.orders(product_id)
  where status not in ('CANCELLED', 'EXPIRED', 'RETURNED');

create index if not exists idx_orders_buyer_id on public.orders(buyer_id, created_at desc);
create index if not exists idx_orders_seller_id on public.orders(seller_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);

-- Add current_order_id column on locker_compartments if not exists (kept null on public table to protect privacy)
alter table public.locker_compartments
  add column if not exists current_order_id uuid references public.orders(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 3. ORDER_EVENTS TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (
    event_type in (
      'ORDER_CREATED',
      'SELLER_CONFIRMED',
      'LOCKER_RESERVED',
      'ITEM_DROPPED_OFF',
      'OTP_GENERATED',
      'LOCKER_UNLOCKED',
      'ITEM_PICKED_UP',
      'ORDER_COMPLETED',
      'ORDER_CANCELLED',
      'ORDER_EXPIRED',
      'DISPUTE_OPENED'
    )
  ),
  previous_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_events_order_id on public.order_events(order_id, created_at asc);

-- -----------------------------------------------------------------------------
-- 4. LOCKER_RESERVATIONS TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.locker_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  compartment_id text not null references public.locker_compartments(id) on delete cascade,
  reserved_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  released_at timestamptz,
  status text not null default 'ACTIVE' check (
    status in ('ACTIVE', 'USED', 'EXPIRED', 'RELEASED')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

-- At most ONE active/used reservation per compartment at any time
create unique index if not exists idx_locker_reservations_one_active_per_comp
  on public.locker_reservations(compartment_id)
  where status in ('ACTIVE', 'USED');

create index if not exists idx_locker_reservations_order_id on public.locker_reservations(order_id);

-- -----------------------------------------------------------------------------
-- 5. LOCKER_ACCESS_TOKENS TABLE (NO Plaintext OTP Stored!)
-- -----------------------------------------------------------------------------
create table if not exists public.locker_access_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  compartment_id text not null references public.locker_compartments(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_locker_access_tokens_order_id on public.locker_access_tokens(order_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 6. PAYMENT_RECORDS TABLE (Payment Simulator Only)
-- -----------------------------------------------------------------------------
create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount integer not null check (amount >= 0),
  status text not null default 'HELD_DEMO' check (
    status in ('PENDING', 'HELD_DEMO', 'RELEASED_DEMO', 'REFUNDED_DEMO')
  ),
  held_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payment_records_buyer_id on public.payment_records(buyer_id);
create index if not exists idx_payment_records_seller_id on public.payment_records(seller_id);

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) FOR PHASE 3 TABLES
-- -----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.locker_reservations enable row level security;
alter table public.locker_access_tokens enable row level security;
alter table public.payment_records enable row level security;

-- Orders: Only buyer or seller of the order can SELECT; direct client writes blocked (handled via transactional RPCs)
drop policy if exists "orders_select_participant" on public.orders;
create policy "orders_select_participant" on public.orders
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Order events: Only buyer or seller of the parent order can SELECT; direct client INSERT/UPDATE/DELETE blocked
drop policy if exists "order_events_select_participant" on public.order_events;
create policy "order_events_select_participant" on public.order_events
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Locker reservations: Only buyer or seller of the parent order can SELECT
drop policy if exists "locker_reservations_select_participant" on public.locker_reservations;
create policy "locker_reservations_select_participant" on public.locker_reservations
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = locker_reservations.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Locker access tokens: NO client SELECT/INSERT/UPDATE/DELETE policies!
-- Clients can NEVER read token_hash or query locker_access_tokens directly.
drop policy if exists "locker_access_tokens_no_client_access" on public.locker_access_tokens;

-- Payment records: Only buyer or seller of the order can SELECT
drop policy if exists "payment_records_select_participant" on public.payment_records;
create policy "payment_records_select_participant" on public.payment_records
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- -----------------------------------------------------------------------------
-- 8. HELPER FUNCTIONS FOR LOCKER COUNT SYNC & OTP DERIVATION
-- -----------------------------------------------------------------------------
create or replace function public.sync_locker_available_count(p_locker_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_available integer;
begin
  if p_locker_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'AVAILABLE')::integer
  into v_total, v_available
  from public.locker_compartments
  where locker_id = p_locker_id;

  update public.locker_locations
  set
    total_compartments = coalesce(v_total, 0),
    available_compartments = coalesce(v_available, 0),
    updated_at = timezone('utc', now())
  where id = p_locker_id;
end;
$$;

-- Clean up any static demo order codes on locker_compartments that do not have active reservations
update public.locker_compartments c
set
  status = 'AVAILABLE',
  current_order_code = null,
  current_order_id = null,
  updated_at = timezone('utc', now())
where c.status in ('RESERVED', 'OCCUPIED')
  and not exists (
    select 1 from public.locker_reservations r
    where r.compartment_id = c.id
      and r.status in ('ACTIVE', 'USED')
  );

select public.sync_locker_available_count('locker-ktx-a');
select public.sync_locker_available_count('locker-thu-vien');

-- Internal deterministic 6-digit OTP derivation from token UUID + order UUID (never exposed to public)
create or replace function public.derive_internal_otp_code(
  p_token_id uuid,
  p_order_id uuid
)
returns text
language plpgsql
immutable
security definer
set search_path = public, extensions
as $$
declare
  v_mac bytea;
  v_num bigint;
begin
  v_mac := hmac(
    (p_token_id::text || ':' || p_order_id::text)::bytea,
    (current_database() || ':edulocker-phase3-otp-secret-v1')::bytea,
    'sha256'
  );
  v_num := (
    (get_byte(v_mac, 0)::bigint << 24) |
    (get_byte(v_mac, 1)::bigint << 16) |
    (get_byte(v_mac, 2)::bigint << 8) |
    get_byte(v_mac, 3)::bigint
  );
  v_num := abs(v_num) % 900000 + 100000;
  return lpad(v_num::text, 6, '0');
end;
$$;

revoke all on function public.derive_internal_otp_code(uuid, uuid) from public, anon, authenticated;

create or replace function public.hash_locker_otp(
  p_order_id uuid,
  p_otp_code text
)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(
    digest(
      (p_order_id::text || ':' || trim(coalesce(p_otp_code, '')))::bytea,
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.hash_locker_otp(uuid, text) from public, anon, authenticated;

-- Protect products from unauthorized manual transitions into/out of RESERVED or SOLD
create or replace function public.protect_product_order_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('edulocker.trusted_order_rpc', true) = 'true' then
    return new;
  end if;

  if old.status in ('RESERVED', 'SOLD') then
    raise exception 'Không thể chỉnh sửa sản phẩm đang trong giao dịch hoặc đã bán.' using errcode = '42501';
  end if;

  if new.status in ('RESERVED', 'SOLD') and new.status is distinct from old.status then
    raise exception 'Trạng thái RESERVED/SOLD chỉ được cập nhật thông qua hệ thống đơn hàng.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_product_order_lock on public.products;
create trigger trg_protect_product_order_lock
  before update on public.products
  for each row
  execute function public.protect_product_order_lock();

-- -----------------------------------------------------------------------------
-- 9. ORDER EXPIRATION & RESOURCE CLEANUP FUNCTION
-- -----------------------------------------------------------------------------
create or replace function public.rpc_expire_order_if_needed(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  perform set_config('edulocker.trusted_order_rpc', 'true', true);

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('expired', false, 'reason', 'NOT_FOUND');
  end if;

  if v_order.status in ('PENDING', 'SELLER_CONFIRMED', 'AWAITING_DROPOFF', 'READY_FOR_PICKUP')
     and v_order.expires_at is not null
     and v_order.expires_at <= timezone('utc', now()) then

    update public.orders
    set
      status = 'EXPIRED',
      updated_at = timezone('utc', now())
    where id = p_order_id;

    -- Release product back to AVAILABLE
    update public.products
    set
      status = 'AVAILABLE',
      updated_at = timezone('utc', now())
    where id = v_order.product_id
      and status = 'RESERVED';

    -- Release compartment if reserved or occupied
    if v_order.locker_compartment_id is not null then
      update public.locker_compartments
      set
        status = 'AVAILABLE',
        current_order_id = null,
        current_order_code = null,
        updated_at = timezone('utc', now())
      where id = v_order.locker_compartment_id
        and status <> 'MAINTENANCE';

      perform public.sync_locker_available_count(v_order.locker_location_id);
    end if;

    -- Mark reservation EXPIRED
    update public.locker_reservations
    set
      status = 'EXPIRED',
      released_at = timezone('utc', now())
    where order_id = p_order_id
      and status in ('ACTIVE', 'USED');

    -- Revoke OTP tokens
    update public.locker_access_tokens
    set revoked_at = timezone('utc', now())
    where order_id = p_order_id
      and revoked_at is null
      and used_at is null;

    -- Refund demo payment
    update public.payment_records
    set
      status = 'REFUNDED_DEMO',
      refunded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where order_id = p_order_id
      and status = 'HELD_DEMO';

    insert into public.order_events (
      order_id,
      actor_id,
      event_type,
      previous_status,
      new_status,
      metadata
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

grant execute on function public.rpc_expire_order_if_needed(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 10. ATOMIC CREATE ORDER RPC (CONCURRENCY-SAFE)
-- -----------------------------------------------------------------------------
create or replace function public.rpc_create_order(
  p_product_id uuid,
  p_preferred_locker_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_product public.products%rowtype;
  v_locker_id text;
  v_order_id uuid;
begin
  v_buyer_id := auth.uid();
  if v_buyer_id is null then
    raise exception 'Vui lòng đăng nhập để đặt mua sản phẩm.' using errcode = '42501';
  end if;

  -- Lock product row to prevent race conditions when two buyers click buy at the same time
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Sản phẩm không tồn tại.' using errcode = 'P0002';
  end if;

  if v_product.seller_id = v_buyer_id then
    raise exception 'Bạn không thể tự đặt mua sản phẩm của chính mình.' using errcode = '23514';
  end if;

  if v_product.status <> 'AVAILABLE' then
    raise exception 'Sản phẩm vừa được người khác đặt mua.' using errcode = '23505';
  end if;

  -- Double-check no active order exists
  if exists (
    select 1 from public.orders o
    where o.product_id = p_product_id
      and o.status not in ('CANCELLED', 'EXPIRED', 'RETURNED')
  ) then
    raise exception 'Sản phẩm vừa được người khác đặt mua.' using errcode = '23505';
  end if;

  v_locker_id := coalesce(
    nullif(trim(p_preferred_locker_id), ''),
    v_product.preferred_locker_id,
    'locker-thu-vien'
  );

  if not exists (select 1 from public.locker_locations where id = v_locker_id) then
    v_locker_id := coalesce(v_product.preferred_locker_id, 'locker-thu-vien');
  end if;

  -- 1. Reserve product atomically
  perform set_config('edulocker.trusted_order_rpc', 'true', true);
  update public.products
  set
    status = 'RESERVED',
    updated_at = timezone('utc', now())
  where id = p_product_id;

  -- 2. Create order in PENDING state (24h confirmation window)
  insert into public.orders (
    buyer_id,
    seller_id,
    product_id,
    locker_location_id,
    status,
    product_price,
    total_amount,
    expires_at
  ) values (
    v_buyer_id,
    v_product.seller_id,
    p_product_id,
    v_locker_id,
    'PENDING',
    v_product.price,
    v_product.price,
    timezone('utc', now()) + interval '24 hours'
  )
  returning id into v_order_id;

  -- 3. Create Payment Simulator record in HELD_DEMO state
  insert into public.payment_records (
    order_id,
    buyer_id,
    seller_id,
    amount,
    status,
    held_at
  ) values (
    v_order_id,
    v_buyer_id,
    v_product.seller_id,
    v_product.price,
    'HELD_DEMO',
    timezone('utc', now())
  );

  -- 4. Record ORDER_CREATED event
  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    v_order_id,
    v_buyer_id,
    'ORDER_CREATED',
    null,
    'PENDING',
    jsonb_build_object(
      'product_id', p_product_id,
      'locker_location_id', v_locker_id,
      'total_amount', v_product.price,
      'payment_status', 'HELD_DEMO'
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'status', 'PENDING',
    'payment_status', 'HELD_DEMO'
  );
exception
  when unique_violation then
    raise exception 'Sản phẩm vừa được người khác đặt mua.' using errcode = '23505';
end;
$$;

grant execute on function public.rpc_create_order(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. SELLER CONFIRM ORDER & ALLOCATE SMART LOCKER COMPARTMENT RPC
-- -----------------------------------------------------------------------------
create or replace function public.rpc_seller_confirm_order(
  p_order_id uuid,
  p_locker_location_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_location_id text;
  v_comp public.locker_compartments%rowtype;
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

  if v_order.status <> 'PENDING' then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  v_location_id := coalesce(
    nullif(trim(p_locker_location_id), ''),
    v_order.locker_location_id,
    'locker-thu-vien'
  );

  if not exists (select 1 from public.locker_locations where id = v_location_id) then
    raise exception 'Trạm Smart Locker không tồn tại.' using errcode = '23514';
  end if;

  -- Allocate first AVAILABLE compartment at the selected station (never MAINTENANCE/RESERVED/OCCUPIED)
  select c.* into v_comp
  from public.locker_compartments c
  where c.locker_id = v_location_id
    and c.status = 'AVAILABLE'
    and not exists (
      select 1 from public.locker_reservations r
      where r.compartment_id = c.id
        and r.status in ('ACTIVE', 'USED')
    )
  order by c.code asc
  for update skip locked
  limit 1;

  if v_comp.id is null then
    raise exception 'Hiện không còn ngăn trống tại trạm này. Vui lòng chọn trạm khác.' using errcode = 'P0001';
  end if;

  -- Reserve compartment (do NOT expose order_id in public compartment columns)
  update public.locker_compartments
  set
    status = 'RESERVED',
    current_order_id = null,
    current_order_code = null,
    updated_at = timezone('utc', now())
  where id = v_comp.id;

  perform public.sync_locker_available_count(v_location_id);

  insert into public.locker_reservations (
    order_id,
    compartment_id,
    reserved_at,
    expires_at,
    status
  ) values (
    p_order_id,
    v_comp.id,
    timezone('utc', now()),
    timezone('utc', now()) + interval '24 hours',
    'ACTIVE'
  );

  -- Transition PENDING -> SELLER_CONFIRMED -> AWAITING_DROPOFF
  update public.orders
  set
    status = 'AWAITING_DROPOFF',
    locker_location_id = v_location_id,
    locker_compartment_id = v_comp.id,
    seller_confirmed_at = timezone('utc', now()),
    expires_at = timezone('utc', now()) + interval '24 hours',
    updated_at = timezone('utc', now())
  where id = p_order_id;

  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'SELLER_CONFIRMED',
    'PENDING',
    'SELLER_CONFIRMED',
    jsonb_build_object('locker_location_id', v_location_id)
  );

  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'LOCKER_RESERVED',
    'SELLER_CONFIRMED',
    'AWAITING_DROPOFF',
    jsonb_build_object(
      'locker_location_id', v_location_id,
      'compartment_id', v_comp.id,
      'compartment_code', v_comp.code,
      'compartment_size', v_comp.size
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'AWAITING_DROPOFF',
    'locker_location_id', v_location_id,
    'compartment_id', v_comp.id,
    'compartment_code', v_comp.code
  );
end;
$$;

grant execute on function public.rpc_seller_confirm_order(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 12. SELLER DROP-OFF & OTP GENERATION RPC
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

  -- 2. Revoke any old tokens for this order & generate new hashed 6-digit OTP (TTL 30m, max_attempts 5)
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
    id,
    order_id,
    compartment_id,
    token_hash,
    expires_at,
    attempt_count,
    max_attempts
  ) values (
    v_token_id,
    p_order_id,
    v_comp.id,
    v_token_hash,
    v_otp_expires_at,
    0,
    5
  );

  -- 3. Order AWAITING_DROPOFF -> IN_LOCKER -> READY_FOR_PICKUP
  update public.orders
  set
    status = 'READY_FOR_PICKUP',
    dropped_off_at = timezone('utc', now()),
    ready_for_pickup_at = timezone('utc', now()),
    expires_at = v_otp_expires_at,
    updated_at = timezone('utc', now())
  where id = p_order_id;

  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
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

  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    null,
    'OTP_GENERATED',
    'IN_LOCKER',
    'READY_FOR_PICKUP',
    jsonb_build_object(
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
    'expires_at', v_otp_expires_at
  );
end;
$$;

grant execute on function public.rpc_seller_dropoff(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 13. DEMO OTP DELIVERY RPC (BUYER ONLY, NEVER EXPOSES TOKEN_HASH)
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

  select * into v_order
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_actor_id then
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

grant execute on function public.rpc_get_buyer_demo_otp(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 14. VERIFY LOCKER OTP RPC (BUYER ONLY, PERSISTS FAILED ATTEMPTS)
-- -----------------------------------------------------------------------------
create or replace function public.rpc_verify_locker_otp(
  p_order_id uuid,
  p_otp_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_token public.locker_access_tokens%rowtype;
  v_input_hash text;
  v_new_attempts integer;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Bạn không có quyền thao tác đơn hàng này.'
    );
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Đơn hàng không tồn tại.'
    );
  end if;

  if v_order.buyer_id <> v_actor_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Bạn không có quyền thao tác đơn hàng này.'
    );
  end if;

  if v_order.status = 'EXPIRED' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ORDER_EXPIRED',
      'message', 'Đơn hàng đã hết hạn.'
    );
  end if;

  if v_order.status <> 'READY_FOR_PICKUP' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS',
      'message', 'Đơn hàng không còn ở trạng thái phù hợp.'
    );
  end if;

  select * into v_token
  from public.locker_access_tokens
  where order_id = p_order_id
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NO_TOKEN',
      'message', 'Mã OTP không đúng.'
    );
  end if;

  if v_token.used_at is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_USED',
      'message', 'Mã OTP này đã được sử dụng.'
    );
  end if;

  if v_token.revoked_at is not null or v_token.attempt_count >= v_token.max_attempts then
    return jsonb_build_object(
      'success', false,
      'error_code', 'MAX_ATTEMPTS',
      'message', 'Bạn đã nhập sai quá số lần cho phép.'
    );
  end if;

  if v_token.expires_at <= timezone('utc', now()) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OTP_EXPIRED',
      'message', 'Mã OTP đã hết hạn.'
    );
  end if;

  v_input_hash := public.hash_locker_otp(p_order_id, p_otp_code);

  if v_input_hash <> v_token.token_hash then
    v_new_attempts := v_token.attempt_count + 1;

    update public.locker_access_tokens
    set
      attempt_count = v_new_attempts,
      revoked_at = case
        when v_new_attempts >= max_attempts then timezone('utc', now())
        else revoked_at
      end
    where id = v_token.id;

    if v_new_attempts >= v_token.max_attempts then
      return jsonb_build_object(
        'success', false,
        'error_code', 'MAX_ATTEMPTS',
        'message', 'Bạn đã nhập sai quá số lần cho phép.',
        'attempt_count', v_new_attempts,
        'max_attempts', v_token.max_attempts
      );
    end if;

    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_OTP',
      'message', 'Mã OTP không đúng.',
      'attempt_count', v_new_attempts,
      'max_attempts', v_token.max_attempts
    );
  end if;

  -- Valid OTP: mark used_at and log LOCKER_UNLOCKED event
  -- Compartment remains OCCUPIED in DB until Buyer confirms item pickup
  update public.locker_access_tokens
  set used_at = timezone('utc', now())
  where id = v_token.id;

  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'LOCKER_UNLOCKED',
    'READY_FOR_PICKUP',
    'READY_FOR_PICKUP',
    jsonb_build_object(
      'compartment_id', v_order.locker_compartment_id,
      'unlocked_at', timezone('utc', now())
    )
  );

  return jsonb_build_object(
    'success', true,
    'unlocked', true,
    'order_id', p_order_id,
    'compartment_id', v_order.locker_compartment_id
  );
end;
$$;

grant execute on function public.rpc_verify_locker_otp(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 15. BUYER CONFIRM PICKUP RPC (RELEASES LOCKER COMPARTMENT)
-- -----------------------------------------------------------------------------
create or replace function public.rpc_confirm_pickup(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_token public.locker_access_tokens%rowtype;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_actor_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status <> 'READY_FOR_PICKUP' then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  select * into v_token
  from public.locker_access_tokens
  where order_id = p_order_id
  order by created_at desc
  limit 1;

  if not found or v_token.used_at is null then
    raise exception 'Vui lòng nhập mã OTP mở khóa ngăn tủ trước khi xác nhận lấy hàng.' using errcode = '23514';
  end if;

  -- 1. Order READY_FOR_PICKUP -> PICKED_UP
  update public.orders
  set
    status = 'PICKED_UP',
    picked_up_at = timezone('utc', now()),
    expires_at = timezone('utc', now()) + interval '24 hours',
    updated_at = timezone('utc', now())
  where id = p_order_id;

  -- 2. Compartment OCCUPIED -> AVAILABLE
  if v_order.locker_compartment_id is not null then
    update public.locker_compartments
    set
      status = 'AVAILABLE',
      current_order_id = null,
      current_order_code = null,
      updated_at = timezone('utc', now())
    where id = v_order.locker_compartment_id
      and status <> 'MAINTENANCE';

    perform public.sync_locker_available_count(v_order.locker_location_id);
  end if;

  -- 3. Reservation -> RELEASED
  update public.locker_reservations
  set
    status = 'RELEASED',
    released_at = timezone('utc', now())
  where order_id = p_order_id
    and status in ('ACTIVE', 'USED');

  -- 4. Event ITEM_PICKED_UP
  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'ITEM_PICKED_UP',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    jsonb_build_object(
      'compartment_id', v_order.locker_compartment_id,
      'locker_released', true
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'PICKED_UP',
    'compartment_status', 'AVAILABLE'
  );
end;
$$;

grant execute on function public.rpc_confirm_pickup(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 16. COMPLETE ORDER RPC (PRODUCT -> SOLD, PAYMENT -> RELEASED_DEMO)
-- -----------------------------------------------------------------------------
create or replace function public.rpc_complete_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_actor_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status <> 'PICKED_UP' then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  -- 1. Order PICKED_UP -> COMPLETED
  update public.orders
  set
    status = 'COMPLETED',
    completed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_order_id;

  -- 2. Product RESERVED -> SOLD
  perform set_config('edulocker.trusted_order_rpc', 'true', true);
  update public.products
  set
    status = 'SOLD',
    updated_at = timezone('utc', now())
  where id = v_order.product_id;

  -- 3. Payment HELD_DEMO -> RELEASED_DEMO
  update public.payment_records
  set
    status = 'RELEASED_DEMO',
    released_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where order_id = p_order_id;

  -- 4. Trusted update of completed_transactions & eco_points for buyer and seller
  perform set_config('edulocker.trusted_auth_sync', 'true', true);
  update public.profiles
  set
    completed_transactions = completed_transactions + 1,
    eco_points = eco_points + 10,
    updated_at = timezone('utc', now())
  where id in (v_order.buyer_id, v_order.seller_id);

  -- 5. Event ORDER_COMPLETED
  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'ORDER_COMPLETED',
    'PICKED_UP',
    'COMPLETED',
    jsonb_build_object(
      'product_status', 'SOLD',
      'payment_status', 'RELEASED_DEMO'
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'COMPLETED',
    'product_status', 'SOLD',
    'payment_status', 'RELEASED_DEMO'
  );
end;
$$;

grant execute on function public.rpc_complete_order(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 17. CANCEL ORDER RPC (ALLOWED ONLY IN PENDING, SELLER_CONFIRMED, AWAITING_DROPOFF)
-- -----------------------------------------------------------------------------
create or replace function public.rpc_cancel_order(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_actor_id <> v_order.buyer_id and v_actor_id <> v_order.seller_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status not in ('PENDING', 'SELLER_CONFIRMED', 'AWAITING_DROPOFF') then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  -- 1. Order -> CANCELLED
  update public.orders
  set
    status = 'CANCELLED',
    cancelled_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_order_id;

  -- 2. Product -> AVAILABLE
  perform set_config('edulocker.trusted_order_rpc', 'true', true);
  update public.products
  set
    status = 'AVAILABLE',
    updated_at = timezone('utc', now())
  where id = v_order.product_id;

  -- 3. Release locker compartment if reserved
  if v_order.locker_compartment_id is not null then
    update public.locker_compartments
    set
      status = 'AVAILABLE',
      current_order_id = null,
      current_order_code = null,
      updated_at = timezone('utc', now())
    where id = v_order.locker_compartment_id
      and status <> 'MAINTENANCE';

    perform public.sync_locker_available_count(v_order.locker_location_id);
  end if;

  -- 4. Release reservation
  update public.locker_reservations
  set
    status = 'RELEASED',
    released_at = timezone('utc', now())
  where order_id = p_order_id
    and status in ('ACTIVE', 'USED');

  -- 5. Revoke any active OTP tokens
  update public.locker_access_tokens
  set revoked_at = timezone('utc', now())
  where order_id = p_order_id
    and revoked_at is null
    and used_at is null;

  -- 6. Payment -> REFUNDED_DEMO
  update public.payment_records
  set
    status = 'REFUNDED_DEMO',
    refunded_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where order_id = p_order_id;

  -- 7. Event ORDER_CANCELLED
  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'ORDER_CANCELLED',
    v_order.status,
    'CANCELLED',
    jsonb_build_object(
      'reason', coalesce(nullif(trim(p_reason), ''), 'Hủy đơn hàng trước khi gửi tủ'),
      'product_status', 'AVAILABLE',
      'payment_status', 'REFUNDED_DEMO'
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'CANCELLED',
    'product_status', 'AVAILABLE',
    'payment_status', 'REFUNDED_DEMO'
  );
end;
$$;

grant execute on function public.rpc_cancel_order(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 18. OPEN DISPUTE RPC (BUYER ONLY AFTER PICKED_UP, KEEPS PAYMENT HELD_DEMO)
-- -----------------------------------------------------------------------------
create or replace function public.rpc_open_dispute(
  p_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_clean_reason text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  v_clean_reason := trim(coalesce(p_reason, ''));
  if char_length(v_clean_reason) < 10 then
    raise exception 'Vui lòng mô tả lý do khiếu nại tối thiểu 10 ký tự.' using errcode = '23514';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_actor_id then
    raise exception 'Bạn không có quyền thao tác đơn hàng này.' using errcode = '42501';
  end if;

  if v_order.status <> 'PICKED_UP' then
    raise exception 'Đơn hàng không còn ở trạng thái phù hợp.' using errcode = '23514';
  end if;

  update public.orders
  set
    status = 'DISPUTED',
    dispute_reason = v_clean_reason,
    updated_at = timezone('utc', now())
  where id = p_order_id;

  -- Payment stays HELD_DEMO (do not release)
  update public.payment_records
  set
    status = 'HELD_DEMO',
    updated_at = timezone('utc', now())
  where order_id = p_order_id;

  insert into public.order_events (
    order_id,
    actor_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) values (
    p_order_id,
    v_actor_id,
    'DISPUTE_OPENED',
    'PICKED_UP',
    'DISPUTED',
    jsonb_build_object(
      'dispute_reason', v_clean_reason,
      'payment_status', 'HELD_DEMO'
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'DISPUTED',
    'payment_status', 'HELD_DEMO'
  );
end;
$$;

grant execute on function public.rpc_open_dispute(uuid, text) to authenticated;

