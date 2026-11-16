-- =============================================================================
-- EduLocker Phase 5.1: Admin hardware status + enable/disable controls
-- =============================================================================

-- Admin-only device status snapshot. Device secrets/hashes are never returned.
create or replace function public.rpc_admin_list_locker_devices()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_devices jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Chỉ quản trị viên đang hoạt động mới có quyền này.' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'device_id', d.id,
        'compartment_id', d.compartment_id,
        'compartment_code', c.code,
        'label', d.label,
        'enabled', d.enabled,
        'connection_status',
          case
            when not d.enabled then 'DISABLED'
            when d.last_seen_at is not null
             and d.last_seen_at >= timezone('utc', now()) - interval '15 seconds'
              then 'ONLINE'
            else 'OFFLINE'
          end,
        'last_seen_at', d.last_seen_at,
        'firmware_version', d.firmware_version,
        'last_command_at', d.last_command_at,
        'last_ack_at', d.last_ack_at,
        'pending_commands', (
          select count(*)
          from public.locker_device_commands q
          where q.device_id = d.id
            and q.status in ('PENDING', 'DISPATCHED')
            and q.expires_at > timezone('utc', now())
        )
      )
      order by c.code
    ),
    '[]'::jsonb
  )
  into v_devices
  from public.locker_devices d
  join public.locker_compartments c on c.id = d.compartment_id;

  return jsonb_build_object(
    'success', true,
    'devices', v_devices,
    'generated_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.rpc_admin_set_locker_device_enabled(
  p_device_id text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device_id text := upper(trim(coalesce(p_device_id, '')));
  v_compartment_id text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Chỉ quản trị viên đang hoạt động mới có quyền này.' using errcode = '42501';
  end if;

  update public.locker_devices
  set
    enabled = p_enabled,
    updated_at = timezone('utc', now())
  where id = v_device_id
  returning compartment_id into v_compartment_id;

  if v_compartment_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DEVICE_NOT_FOUND',
      'message', 'Không tìm thấy thiết bị ESP32.'
    );
  end if;

  -- When disabling a device, expire any outstanding command so an old command
  -- cannot be executed if the device is enabled again later.
  if not p_enabled then
    update public.locker_device_commands
    set
      status = 'EXPIRED',
      updated_at = timezone('utc', now())
    where device_id = v_device_id
      and status in ('PENDING', 'DISPATCHED');
  end if;

  return jsonb_build_object(
    'success', true,
    'device_id', v_device_id,
    'compartment_id', v_compartment_id,
    'enabled', p_enabled
  );
end;
$$;

revoke all on function public.rpc_admin_list_locker_devices() from public, anon;
revoke all on function public.rpc_admin_set_locker_device_enabled(text, boolean) from public, anon;
grant execute on function public.rpc_admin_list_locker_devices() to authenticated;
grant execute on function public.rpc_admin_set_locker_device_enabled(text, boolean) to authenticated;
