-- =============================================================================
-- EduLocker Phase 5: ESP32 Smart Locker Hardware Bridge
-- Keeps existing order/OTP state machine intact and adds a secure command queue
-- for physical locker devices.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. DEVICE REGISTRY
-- -----------------------------------------------------------------------------
create table if not exists public.locker_devices (
  id text primary key,
  compartment_id text not null unique references public.locker_compartments(id) on delete cascade,
  label text,
  secret_hash text not null,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  firmware_version text,
  last_command_at timestamptz,
  last_ack_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_locker_devices_enabled
  on public.locker_devices(enabled, compartment_id);

-- -----------------------------------------------------------------------------
-- 2. HARDWARE COMMAND QUEUE
-- -----------------------------------------------------------------------------
create table if not exists public.locker_device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.locker_devices(id) on delete cascade,
  compartment_id text not null references public.locker_compartments(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  action text not null check (action in ('OPEN', 'CLOSE')),
  reason text not null check (
    reason in ('SELLER_DROPOFF', 'BUYER_PICKUP', 'ADMIN_TEST', 'SYSTEM')
  ),
  duration_ms integer not null default 60000 check (duration_ms between 1000 and 120000),
  status text not null default 'PENDING' check (
    status in ('PENDING', 'DISPATCHED', 'ACKED', 'FAILED', 'EXPIRED')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '2 minutes'),
  dispatched_at timestamptz,
  acked_at timestamptz,
  response_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_locker_device_commands_poll
  on public.locker_device_commands(device_id, status, created_at);

create unique index if not exists idx_locker_device_commands_one_active_action
  on public.locker_device_commands(device_id, action)
  where status in ('PENDING', 'DISPATCHED');

alter table public.locker_devices enable row level security;
alter table public.locker_device_commands enable row level security;

-- No direct Data API access. Device and admin access is only through RPCs below.
revoke all on table public.locker_devices from public, anon, authenticated;
revoke all on table public.locker_device_commands from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. INTERNAL HELPERS
-- -----------------------------------------------------------------------------
create or replace function public.hash_locker_device_secret(p_secret text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(convert_to(coalesce(p_secret, ''), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.enqueue_locker_device_command(
  p_compartment_id text,
  p_order_id uuid,
  p_action text,
  p_reason text,
  p_duration_ms integer default 60000
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device_id text;
  v_command_id uuid;
  v_action text := upper(trim(coalesce(p_action, '')));
  v_reason text := upper(trim(coalesce(p_reason, 'SYSTEM')));
  v_duration integer := greatest(1000, least(coalesce(p_duration_ms, 60000), 120000));
begin
  if v_action not in ('OPEN', 'CLOSE') then
    raise exception 'Lệnh locker không hợp lệ.' using errcode = '23514';
  end if;

  if v_reason not in ('SELLER_DROPOFF', 'BUYER_PICKUP', 'ADMIN_TEST', 'SYSTEM') then
    v_reason := 'SYSTEM';
  end if;

  select d.id into v_device_id
  from public.locker_devices d
  where d.compartment_id = p_compartment_id
    and d.enabled = true
  limit 1;

  -- Simulator-only compartment: keep the existing web flow working normally.
  if v_device_id is null then
    return null;
  end if;

  update public.locker_device_commands
  set
    status = 'EXPIRED',
    updated_at = timezone('utc', now())
  where device_id = v_device_id
    and action = v_action
    and status in ('PENDING', 'DISPATCHED')
    and expires_at <= timezone('utc', now());

  begin
    insert into public.locker_device_commands (
      device_id,
      compartment_id,
      order_id,
      action,
      reason,
      duration_ms,
      status,
      expires_at
    ) values (
      v_device_id,
      p_compartment_id,
      p_order_id,
      v_action,
      v_reason,
      v_duration,
      'PENDING',
      timezone('utc', now()) + interval '2 minutes'
    )
    returning id into v_command_id;
  exception
    when unique_violation then
      select c.id into v_command_id
      from public.locker_device_commands c
      where c.device_id = v_device_id
        and c.action = v_action
        and c.status in ('PENDING', 'DISPATCHED')
      order by c.created_at desc
      limit 1;
  end;

  update public.locker_devices
  set
    last_command_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_device_id;

  return v_command_id;
end;
$$;

revoke all on function public.hash_locker_device_secret(text) from public, anon, authenticated;
revoke all on function public.enqueue_locker_device_command(text, uuid, text, text, integer) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. AUTO-QUEUE OPEN COMMANDS FROM THE EXISTING ORDER STATE MACHINE
--    No rewrite of Phase 3 order/OTP RPCs is required.
-- -----------------------------------------------------------------------------
create or replace function public.trg_queue_locker_hardware_from_order_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_compartment_id text;
  v_reason text;
begin
  if new.event_type not in ('ITEM_DROPPED_OFF', 'LOCKER_UNLOCKED') then
    return new;
  end if;

  select o.locker_compartment_id into v_compartment_id
  from public.orders o
  where o.id = new.order_id;

  if v_compartment_id is null then
    return new;
  end if;

  v_reason := case
    when new.event_type = 'ITEM_DROPPED_OFF' then 'SELLER_DROPOFF'
    when new.event_type = 'LOCKER_UNLOCKED' then 'BUYER_PICKUP'
    else 'SYSTEM'
  end;

  perform public.enqueue_locker_device_command(
    v_compartment_id,
    new.order_id,
    'OPEN',
    v_reason,
    60000
  );

  return new;
end;
$$;

drop trigger if exists trg_order_events_queue_locker_hardware on public.order_events;
create trigger trg_order_events_queue_locker_hardware
after insert on public.order_events
for each row
execute function public.trg_queue_locker_hardware_from_order_event();

revoke all on function public.trg_queue_locker_hardware_from_order_event() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. ADMIN RPC: PAIR / ROTATE A DEVICE SECRET
--    The plaintext device_secret is returned ONCE and is never stored.
-- -----------------------------------------------------------------------------
create or replace function public.rpc_admin_register_locker_device(
  p_device_id text,
  p_compartment_id text,
  p_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device_id text := upper(trim(coalesce(p_device_id, '')));
  v_secret text;
  v_existing_other text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Chỉ quản trị viên đang hoạt động mới có quyền này.' using errcode = '42501';
  end if;

  if v_device_id !~ '^[A-Z0-9_-]{3,64}$' then
    raise exception 'Device ID chỉ được dùng A-Z, 0-9, dấu gạch ngang hoặc gạch dưới.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.locker_compartments where id = p_compartment_id
  ) then
    raise exception 'Ngăn tủ không tồn tại.' using errcode = '23514';
  end if;

  select id into v_existing_other
  from public.locker_devices
  where compartment_id = p_compartment_id
    and id <> v_device_id
  limit 1;

  if v_existing_other is not null then
    raise exception 'Ngăn tủ này đã được ghép với thiết bị khác (%).', v_existing_other using errcode = '23505';
  end if;

  v_secret := encode(gen_random_bytes(24), 'hex');

  insert into public.locker_devices (
    id,
    compartment_id,
    label,
    secret_hash,
    enabled,
    created_at,
    updated_at
  ) values (
    v_device_id,
    p_compartment_id,
    nullif(trim(coalesce(p_label, '')), ''),
    public.hash_locker_device_secret(v_secret),
    true,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    compartment_id = excluded.compartment_id,
    label = excluded.label,
    secret_hash = excluded.secret_hash,
    enabled = true,
    updated_at = timezone('utc', now());

  return jsonb_build_object(
    'success', true,
    'device_id', v_device_id,
    'compartment_id', p_compartment_id,
    'device_secret', v_secret,
    'warning', 'Mã bí mật này chỉ hiển thị một lần. Nhấn ghép lại sẽ vô hiệu mã cũ.'
  );
end;
$$;

create or replace function public.rpc_admin_queue_locker_command(
  p_compartment_id text,
  p_action text default 'OPEN'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_command_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Chỉ quản trị viên đang hoạt động mới có quyền này.' using errcode = '42501';
  end if;

  v_command_id := public.enqueue_locker_device_command(
    p_compartment_id,
    null,
    upper(trim(coalesce(p_action, 'OPEN'))),
    'ADMIN_TEST',
    60000
  );

  if v_command_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NO_DEVICE',
      'message', 'Ngăn tủ này chưa được ghép với ESP32.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'command_id', v_command_id,
    'action', upper(trim(coalesce(p_action, 'OPEN')))
  );
end;
$$;

revoke all on function public.rpc_admin_register_locker_device(text, text, text) from public, anon;
revoke all on function public.rpc_admin_queue_locker_command(text, text) from public, anon;
grant execute on function public.rpc_admin_register_locker_device(text, text, text) to authenticated;
grant execute on function public.rpc_admin_queue_locker_command(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. DEVICE RPC: POLL FOR A COMMAND
--    Callable with the public/publishable Supabase key, but protected by
--    device_id + per-device secret. Service-role key is NEVER needed on ESP32.
-- -----------------------------------------------------------------------------
create or replace function public.rpc_locker_device_poll(
  p_device_id text,
  p_device_secret text,
  p_firmware_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.locker_devices%rowtype;
  v_command public.locker_device_commands%rowtype;
  v_compartment_code text;
begin
  select d.* into v_device
  from public.locker_devices d
  where d.id = upper(trim(coalesce(p_device_id, '')))
    and d.enabled = true
    and d.secret_hash = public.hash_locker_device_secret(p_device_secret)
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'DEVICE_AUTH_FAILED'
    );
  end if;

  update public.locker_devices
  set
    last_seen_at = timezone('utc', now()),
    firmware_version = nullif(trim(coalesce(p_firmware_version, '')), ''),
    updated_at = timezone('utc', now())
  where id = v_device.id;

  update public.locker_device_commands
  set
    status = 'EXPIRED',
    updated_at = timezone('utc', now())
  where device_id = v_device.id
    and status in ('PENDING', 'DISPATCHED')
    and (
      expires_at <= timezone('utc', now())
      or attempt_count >= 5
    );

  select c.* into v_command
  from public.locker_device_commands c
  where c.device_id = v_device.id
    and c.status in ('PENDING', 'DISPATCHED')
    and c.expires_at > timezone('utc', now())
    and c.attempt_count < 5
    and (
      c.status = 'PENDING'
      or c.dispatched_at is null
      or c.dispatched_at <= timezone('utc', now()) - interval '10 seconds'
    )
  order by c.created_at asc
  for update skip locked
  limit 1;

  select code into v_compartment_code
  from public.locker_compartments
  where id = v_device.compartment_id;

  if not found or v_command.id is null then
    return jsonb_build_object(
      'ok', true,
      'device_id', v_device.id,
      'compartment_id', v_device.compartment_id,
      'compartment_code', v_compartment_code,
      'command', null
    );
  end if;

  update public.locker_device_commands
  set
    status = 'DISPATCHED',
    dispatched_at = timezone('utc', now()),
    attempt_count = attempt_count + 1,
    updated_at = timezone('utc', now())
  where id = v_command.id;

  return jsonb_build_object(
    'ok', true,
    'device_id', v_device.id,
    'compartment_id', v_device.compartment_id,
    'compartment_code', v_compartment_code,
    'command', jsonb_build_object(
      'id', v_command.id,
      'action', v_command.action,
      'reason', v_command.reason,
      'duration_ms', v_command.duration_ms,
      'order_id', v_command.order_id
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. DEVICE RPC: ACKNOWLEDGE COMMAND RESULT
-- -----------------------------------------------------------------------------
create or replace function public.rpc_locker_device_ack(
  p_device_id text,
  p_device_secret text,
  p_command_id uuid,
  p_success boolean,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.locker_devices%rowtype;
  v_command public.locker_device_commands%rowtype;
begin
  select d.* into v_device
  from public.locker_devices d
  where d.id = upper(trim(coalesce(p_device_id, '')))
    and d.enabled = true
    and d.secret_hash = public.hash_locker_device_secret(p_device_secret)
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'DEVICE_AUTH_FAILED'
    );
  end if;

  select c.* into v_command
  from public.locker_device_commands c
  where c.id = p_command_id
    and c.device_id = v_device.id
    and c.compartment_id = v_device.compartment_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'COMMAND_NOT_FOUND'
    );
  end if;

  -- Idempotent ACK.
  if v_command.status = 'ACKED' then
    return jsonb_build_object('ok', true, 'status', 'ACKED');
  end if;

  update public.locker_device_commands
  set
    status = case when p_success then 'ACKED' else 'FAILED' end,
    acked_at = timezone('utc', now()),
    response_message = left(nullif(trim(coalesce(p_message, '')), ''), 500),
    updated_at = timezone('utc', now())
  where id = p_command_id;

  update public.locker_devices
  set
    last_seen_at = timezone('utc', now()),
    last_ack_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_device.id;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_success then 'ACKED' else 'FAILED' end
  );
end;
$$;

revoke all on function public.rpc_locker_device_poll(text, text, text) from public;
revoke all on function public.rpc_locker_device_ack(text, text, uuid, boolean, text) from public;

-- Device calls come from ESP32 without a Supabase user session.
grant execute on function public.rpc_locker_device_poll(text, text, text) to anon, authenticated;
grant execute on function public.rpc_locker_device_ack(text, text, uuid, boolean, text) to anon, authenticated;
