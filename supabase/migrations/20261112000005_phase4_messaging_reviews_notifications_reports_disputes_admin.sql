-- =============================================================================
-- EduLocker Phase 4 Migration:
-- Messaging, Reviews, Notifications, Reports, Dispute Resolution, Admin & Moderation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND PROFILES (account_status) & PRODUCTS (moderation_note)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists account_status text not null default 'ACTIVE'
  check (account_status in ('ACTIVE', 'SUSPENDED'));

alter table public.products
  add column if not exists moderation_note text;

-- Update protect_profile_privileged_fields to also protect account_status from client writes
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trusted_sync text := current_setting('edulocker.trusted_auth_sync', true);
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if v_trusted_sync = 'true' or current_user in ('postgres', 'supabase_admin', 'service_role') or v_jwt_role = 'service_role' then
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

-- Helper: check if current authenticated user is an active Admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'ACTIVE'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. CONVERSATIONS & MESSAGES TABLES
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_buyer_not_seller_check check (buyer_id <> seller_id),
  constraint conversations_unique_product_buyer_seller unique (product_id, buyer_id, seller_id)
);

create index if not exists idx_conversations_buyer_last on public.conversations(buyer_id, last_message_at desc nulls last);
create index if not exists idx_conversations_seller_last on public.conversations(seller_id, last_message_at desc nulls last);
create index if not exists idx_conversations_product on public.conversations(product_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) >= 1 and char_length(content) <= 1000),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Enable Supabase Realtime for messages safely
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. REVIEWS TABLE + SERVER-SIDE SELLER RATING TRIGGER
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  description_accuracy integer not null check (description_accuracy between 1 and 5),
  product_condition_rating integer not null check (product_condition_rating between 1 and 5),
  transaction_rating integer not null check (transaction_rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_no_self_review check (reviewer_id <> reviewee_id)
);

create index if not exists idx_reviews_reviewee_created on public.reviews(reviewee_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public_or_admin" on public.reviews;
create policy "reviews_select_public_or_admin" on public.reviews
  for select
  using (
    is_hidden = false
    or auth.uid() = reviewer_id
    or auth.uid() = reviewee_id
    or public.is_admin()
  );

create or replace function public.recalculate_seller_rating(p_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(3,2);
  v_count integer;
begin
  select
    coalesce(round(avg(rating)::numeric, 2), 5.00),
    count(*)::integer
  into v_avg, v_count
  from public.reviews
  where reviewee_id = p_seller_id
    and is_hidden = false;

  perform set_config('edulocker.trusted_auth_sync', 'true', true);
  update public.profiles
  set
    rating_avg = v_avg,
    rating_count = v_count,
    updated_at = timezone('utc', now())
  where id = p_seller_id;
end;
$$;

revoke all on function public.recalculate_seller_rating(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. NOTIFICATIONS TABLE + SECURE SERVER-SIDE HELPERS
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'ORDER_CREATED',
      'ORDER_CONFIRMED',
      'LOCKER_RESERVED',
      'READY_FOR_PICKUP',
      'OTP_REGENERATED',
      'ORDER_COMPLETED',
      'ORDER_CANCELLED',
      'DISPUTE_OPENED',
      'DISPUTE_RESOLVED',
      'NEW_MESSAGE',
      'NEW_REVIEW',
      'REPORT_STATUS_CHANGED'
    )
  ),
  title text not null,
  message text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_unread on public.notifications(user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own_read" on public.notifications;
create policy "notifications_update_own_read" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.create_notification_internal(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_href text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id, type, title, message, href, metadata
  ) values (
    p_user_id, p_type, p_title, p_message, p_href, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.create_notification_internal(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

-- Trigger on order_events to automatically create notifications for buyer/seller
create or replace function public.notify_on_order_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_href text;
begin
  select * into v_order from public.orders where id = new.order_id;
  if not found then
    return new;
  end if;

  v_href := '/orders/' || v_order.id::text;

  case new.event_type
    when 'ORDER_CREATED' then
      perform public.create_notification_internal(
        v_order.seller_id,
        'ORDER_CREATED',
        'Bạn có đơn đặt mua mới',
        'Có sinh viên vừa đặt mua sản phẩm của bạn qua Smart Locker. Vui lòng xác nhận đơn.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    when 'SELLER_CONFIRMED' then
      perform public.create_notification_internal(
        v_order.buyer_id,
        'ORDER_CONFIRMED',
        'Người bán đã xác nhận đơn hàng',
        'Người bán đã xác nhận đơn hàng và đang chuẩn bị gửi vào Smart Locker.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    when 'LOCKER_RESERVED' then
      perform public.create_notification_internal(
        v_order.buyer_id,
        'LOCKER_RESERVED',
        'Đã giữ chỗ ngăn tủ Smart Locker',
        'Hệ thống đã cấp ngăn tủ cho đơn hàng của bạn, đang chờ người bán gửi hàng.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    when 'OTP_GENERATED' then
      perform public.create_notification_internal(
        v_order.buyer_id,
        'READY_FOR_PICKUP',
        'Hàng đã vào tủ – Mã OTP sẵn sàng',
        'Người bán đã gửi sản phẩm vào Smart Locker. Mở đơn hàng để xem mã OTP và nhận hàng.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    when 'OTP_REGENERATED' then
      perform public.create_notification_internal(
        v_order.buyer_id,
        'OTP_REGENERATED',
        'Đã cấp lại mã OTP mới',
        'Mã OTP mới (hiệu lực 30 phút) đã được tạo cho ngăn tủ của bạn.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    when 'ORDER_COMPLETED' then
      perform public.create_notification_internal(
        v_order.seller_id,
        'ORDER_COMPLETED',
        'Đơn hàng đã hoàn tất',
        'Người mua đã xác nhận nhận hàng. Khoản thanh toán mô phỏng đã được giải ngân.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    when 'ORDER_CANCELLED' then
      if new.actor_id = v_order.buyer_id then
        perform public.create_notification_internal(
          v_order.seller_id,
          'ORDER_CANCELLED',
          'Đơn hàng đã bị hủy',
          'Người mua đã hủy đơn hàng trước khi gửi tủ. Sản phẩm đã mở bán lại.',
          v_href,
          jsonb_build_object('order_id', v_order.id)
        );
      else
        perform public.create_notification_internal(
          v_order.buyer_id,
          'ORDER_CANCELLED',
          'Đơn hàng đã bị hủy',
          'Người bán đã hủy đơn hàng. Thanh toán mô phỏng đã được hoàn trả.',
          v_href,
          jsonb_build_object('order_id', v_order.id)
        );
      end if;
    when 'DISPUTE_OPENED' then
      perform public.create_notification_internal(
        v_order.seller_id,
        'DISPUTE_OPENED',
        'Đơn hàng có khiếu nại cần kiểm tra',
        'Người mua đã gửi báo cáo sản phẩm không đúng mô tả. Quản trị viên sẽ xem xét.',
        v_href,
        jsonb_build_object('order_id', v_order.id)
      );
    else
      null;
  end case;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_order_event on public.order_events;
create trigger trg_notify_on_order_event
  after insert on public.order_events
  for each row
  execute function public.notify_on_order_event();

-- -----------------------------------------------------------------------------
-- 5. REPORTS TABLE (WITH DUPLICATE ACTIVE REPORT PROTECTION)
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('PRODUCT', 'USER', 'MESSAGE')),
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) >= 3 and char_length(reason) <= 200),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'PENDING' check (status in ('PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_reports_unique_active
  on public.reports(reporter_id, target_type, target_id)
  where status in ('PENDING', 'REVIEWING');

create index if not exists idx_reports_status_created on public.reports(status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_select_reporter_or_admin" on public.reports;
create policy "reports_select_reporter_or_admin" on public.reports
  for select to authenticated
  using (auth.uid() = reporter_id or public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. DISPUTES TABLE + SYNC WITH rpc_open_dispute
-- -----------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  description text,
  status text not null default 'OPEN' check (
    status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED')
  ),
  resolution text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create index if not exists idx_disputes_status_created on public.disputes(status, created_at desc);

alter table public.disputes enable row level security;

drop policy if exists "disputes_select_participant_or_admin" on public.disputes;
create policy "disputes_select_participant_or_admin" on public.disputes
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = disputes.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Update rpc_open_dispute to also insert a record into public.disputes
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

  update public.payment_records
  set
    status = 'HELD_DEMO',
    updated_at = timezone('utc', now())
  where order_id = p_order_id;

  insert into public.disputes (
    order_id, opened_by, reason, description, status
  ) values (
    p_order_id, v_actor_id, v_clean_reason, v_clean_reason, 'OPEN'
  )
  on conflict (order_id) do nothing;

  insert into public.order_events (
    order_id, actor_id, event_type, previous_status, new_status, metadata
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

-- Backfill disputes for any existing DISPUTED orders
insert into public.disputes (order_id, opened_by, reason, description, status)
select
  o.id,
  o.buyer_id,
  coalesce(o.dispute_reason, 'Khiếu nại sản phẩm'),
  o.dispute_reason,
  'OPEN'
from public.orders o
where o.status = 'DISPUTED'
on conflict (order_id) do nothing;

-- -----------------------------------------------------------------------------
-- 7. ADMIN RLS POLICIES FOR EXISTING TABLES
-- -----------------------------------------------------------------------------
drop policy if exists "products_select_admin" on public.products;
create policy "products_select_admin" on public.products
  for select to authenticated
  using (public.is_admin());

drop policy if exists "product_images_select_admin" on public.product_images;
create policy "product_images_select_admin" on public.product_images
  for select to authenticated
  using (public.is_admin());

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists "order_events_select_admin" on public.order_events;
create policy "order_events_select_admin" on public.order_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists "locker_reservations_select_admin" on public.locker_reservations;
create policy "locker_reservations_select_admin" on public.locker_reservations
  for select to authenticated
  using (public.is_admin());

drop policy if exists "payment_records_select_admin" on public.payment_records;
create policy "payment_records_select_admin" on public.payment_records
  for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. PHASE 4 TRANSACTIONAL RPCS (MESSAGING, REVIEWS, REPORTS, ADMIN)
-- -----------------------------------------------------------------------------

-- 8.1 Get or create conversation for a valid product
create or replace function public.rpc_get_or_create_conversation(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_product public.products%rowtype;
  v_conv public.conversations%rowtype;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Vui lòng đăng nhập để nhắn tin.' using errcode = '42501';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if not found or v_product.status not in ('AVAILABLE', 'RESERVED', 'SOLD') then
    raise exception 'Sản phẩm không khả dụng để nhắn tin.' using errcode = 'P0002';
  end if;

  if v_product.seller_id = v_actor_id then
    raise exception 'Bạn không thể tự nhắn tin cho sản phẩm của chính mình.' using errcode = '23514';
  end if;

  select * into v_conv
  from public.conversations
  where product_id = p_product_id
    and buyer_id = v_actor_id
    and seller_id = v_product.seller_id;

  if not found then
    insert into public.conversations (
      product_id, buyer_id, seller_id
    ) values (
      p_product_id, v_actor_id, v_product.seller_id
    )
    on conflict (product_id, buyer_id, seller_id) do update
      set updated_at = timezone('utc', now())
    returning * into v_conv;
  end if;

  return jsonb_build_object('conversation_id', v_conv.id);
end;
$$;

-- 8.2 Send message in a conversation (with notification throttling)
create or replace function public.rpc_send_message(
  p_conversation_id uuid,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_conv public.conversations%rowtype;
  v_clean text;
  v_msg public.messages%rowtype;
  v_recipient_id uuid;
  v_sender_name text;
  v_recent_notif_exists boolean;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Vui lòng đăng nhập để gửi tin nhắn.' using errcode = '42501';
  end if;

  v_clean := trim(coalesce(p_content, ''));
  if char_length(v_clean) < 1 or char_length(v_clean) > 1000 then
    raise exception 'Nội dung tin nhắn phải từ 1 đến 1000 ký tự.' using errcode = '23514';
  end if;

  select * into v_conv
  from public.conversations
  where id = p_conversation_id
  for update;

  if not found or (v_actor_id <> v_conv.buyer_id and v_actor_id <> v_conv.seller_id) then
    raise exception 'Bạn không có quyền truy cập cuộc trò chuyện này.' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_actor_id, v_clean)
  returning * into v_msg;

  update public.conversations
  set
    last_message_at = v_msg.created_at,
    updated_at = timezone('utc', now())
  where id = p_conversation_id;

  v_recipient_id := case when v_actor_id = v_conv.buyer_id then v_conv.seller_id else v_conv.buyer_id end;

  -- Avoid spamming duplicate unread NEW_MESSAGE notifications for the same conversation within 2 minutes
  select exists (
    select 1 from public.notifications n
    where n.user_id = v_recipient_id
      and n.type = 'NEW_MESSAGE'
      and n.read_at is null
      and n.metadata->>'conversation_id' = p_conversation_id::text
      and n.created_at >= timezone('utc', now()) - interval '2 minutes'
  ) into v_recent_notif_exists;

  if not v_recent_notif_exists then
    select full_name into v_sender_name from public.profiles where id = v_actor_id;
    perform public.create_notification_internal(
      v_recipient_id,
      'NEW_MESSAGE',
      'Tin nhắn mới từ ' || coalesce(v_sender_name, 'Sinh viên'),
      left(v_clean, 120),
      '/messages/' || p_conversation_id::text,
      jsonb_build_object('conversation_id', p_conversation_id, 'sender_id', v_actor_id)
    );
  end if;

  return jsonb_build_object(
    'id', v_msg.id,
    'conversation_id', v_msg.conversation_id,
    'sender_id', v_msg.sender_id,
    'content', v_msg.content,
    'created_at', v_msg.created_at
  );
end;
$$;

-- 8.3 Mark all incoming messages in a conversation as read
create or replace function public.rpc_mark_conversation_read(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_conv public.conversations%rowtype;
  v_updated integer;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Bạn không có quyền truy cập cuộc trò chuyện này.' using errcode = '42501';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found or (v_actor_id <> v_conv.buyer_id and v_actor_id <> v_conv.seller_id) then
    raise exception 'Bạn không có quyền truy cập cuộc trò chuyện này.' using errcode = '42501';
  end if;

  update public.messages
  set read_at = timezone('utc', now())
  where conversation_id = p_conversation_id
    and sender_id <> v_actor_id
    and read_at is null;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('updated', v_updated);
end;
$$;

-- 8.4 Submit buyer review for a COMPLETED order
create or replace function public.rpc_submit_review(
  p_order_id uuid,
  p_rating integer,
  p_description_accuracy integer,
  p_product_condition_rating integer,
  p_transaction_rating integer,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_review public.reviews%rowtype;
  v_clean_comment text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Vui lòng đăng nhập để đánh giá.' using errcode = '42501';
  end if;

  if p_rating not between 1 and 5
     or p_description_accuracy not between 1 and 5
     or p_product_condition_rating not between 1 and 5
     or p_transaction_rating not between 1 and 5 then
    raise exception 'Điểm đánh giá phải từ 1 đến 5 sao.' using errcode = '23514';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Đơn hàng không tồn tại.' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_actor_id then
    raise exception 'Chỉ người mua của đơn hàng mới có quyền đánh giá.' using errcode = '42501';
  end if;

  if v_order.status <> 'COMPLETED' then
    raise exception 'Chỉ có thể đánh giá sau khi đơn hàng đã hoàn tất.' using errcode = '23514';
  end if;

  if exists (select 1 from public.reviews where order_id = p_order_id) then
    raise exception 'Bạn đã đánh giá đơn hàng này rồi.' using errcode = '23505';
  end if;

  v_clean_comment := nullif(trim(coalesce(p_comment, '')), '');
  if v_clean_comment is not null and char_length(v_clean_comment) > 1000 then
    raise exception 'Nhận xét tối đa 1000 ký tự.' using errcode = '23514';
  end if;

  insert into public.reviews (
    order_id, reviewer_id, reviewee_id,
    rating, description_accuracy, product_condition_rating, transaction_rating, comment
  ) values (
    p_order_id, v_actor_id, v_order.seller_id,
    p_rating, p_description_accuracy, p_product_condition_rating, p_transaction_rating, v_clean_comment
  )
  returning * into v_review;

  perform public.recalculate_seller_rating(v_order.seller_id);

  perform public.create_notification_internal(
    v_order.seller_id,
    'NEW_REVIEW',
    'Bạn nhận được đánh giá ' || p_rating::text || '★ mới',
    coalesce(left(v_clean_comment, 120), 'Người mua đã để lại đánh giá cho giao dịch hoàn tất.'),
    '/orders/' || p_order_id::text,
    jsonb_build_object('order_id', p_order_id, 'review_id', v_review.id, 'rating', p_rating)
  );

  return jsonb_build_object('review_id', v_review.id, 'rating', v_review.rating);
end;
$$;

-- 8.5 Submit report (with duplicate active report protection)
create or replace function public.rpc_submit_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_clean_reason text;
  v_clean_desc text;
  v_report_id uuid;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Vui lòng đăng nhập để gửi báo cáo.' using errcode = '42501';
  end if;

  if p_target_type not in ('PRODUCT', 'USER', 'MESSAGE') then
    raise exception 'Loại đối tượng báo cáo không hợp lệ.' using errcode = '23514';
  end if;

  v_clean_reason := trim(coalesce(p_reason, ''));
  if char_length(v_clean_reason) < 3 or char_length(v_clean_reason) > 200 then
    raise exception 'Vui lòng chọn lý do báo cáo hợp lệ.' using errcode = '23514';
  end if;

  v_clean_desc := nullif(trim(coalesce(p_description, '')), '');
  if v_clean_desc is not null and char_length(v_clean_desc) > 1000 then
    raise exception 'Mô tả chi tiết tối đa 1000 ký tự.' using errcode = '23514';
  end if;

  if p_target_type = 'USER' and p_target_id = v_actor_id then
    raise exception 'Bạn không thể tự báo cáo chính mình.' using errcode = '23514';
  end if;

  insert into public.reports (
    reporter_id, target_type, target_id, reason, description, status
  ) values (
    v_actor_id, p_target_type, p_target_id, v_clean_reason, v_clean_desc, 'PENDING'
  )
  returning id into v_report_id;

  return jsonb_build_object('report_id', v_report_id, 'status', 'PENDING');
exception
  when unique_violation then
    raise exception 'Bạn đã gửi báo cáo cho nội dung này và đang chờ xử lý.' using errcode = '23505';
end;
$$;

-- 8.6 Admin: Review report
create or replace function public.rpc_admin_review_report(
  p_report_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_report public.reports%rowtype;
  v_clean_note text;
begin
  v_actor_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền thực hiện thao tác này.' using errcode = '42501';
  end if;

  if p_status not in ('REVIEWING', 'RESOLVED', 'REJECTED') then
    raise exception 'Trạng thái báo cáo không hợp lệ.' using errcode = '23514';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Báo cáo không tồn tại.' using errcode = 'P0002';
  end if;

  v_clean_note := nullif(trim(coalesce(p_admin_note, '')), '');

  update public.reports
  set
    status = p_status,
    reviewed_by = v_actor_id,
    reviewed_at = timezone('utc', now()),
    admin_note = coalesce(v_clean_note, admin_note)
  where id = p_report_id;

  perform public.create_notification_internal(
    v_report.reporter_id,
    'REPORT_STATUS_CHANGED',
    'Báo cáo của bạn đã được cập nhật',
    'Trạng thái báo cáo: ' || p_status || coalesce(' – Ghi chú: ' || left(v_clean_note, 100), ''),
    '/notifications',
    jsonb_build_object('report_id', p_report_id, 'status', p_status)
  );

  return jsonb_build_object('report_id', p_report_id, 'status', p_status);
end;
$$;

-- 8.7 Admin: Resolve dispute (RESOLVED_BUYER or RESOLVED_SELLER)
create or replace function public.rpc_admin_resolve_dispute(
  p_dispute_id uuid,
  p_outcome text,
  p_resolution_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_dispute public.disputes%rowtype;
  v_order public.orders%rowtype;
  v_clean_note text;
  v_new_order_status text;
  v_new_payment_status text;
begin
  v_actor_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền giải quyết khiếu nại.' using errcode = '42501';
  end if;

  if p_outcome not in ('RESOLVED_BUYER', 'RESOLVED_SELLER') then
    raise exception 'Kết quả giải quyết khiếu nại không hợp lệ.' using errcode = '23514';
  end if;

  v_clean_note := trim(coalesce(p_resolution_note, ''));
  if char_length(v_clean_note) < 5 then
    raise exception 'Vui lòng nhập ghi chú kết quả xử lý tối thiểu 5 ký tự.' using errcode = '23514';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Khiếu nại không tồn tại.' using errcode = 'P0002';
  end if;

  if v_dispute.status not in ('OPEN', 'UNDER_REVIEW') then
    raise exception 'Khiếu nại này đã được xử lý trước đó.' using errcode = '23514';
  end if;

  select * into v_order from public.orders where id = v_dispute.order_id for update;
  if not found or v_order.status <> 'DISPUTED' then
    raise exception 'Đơn hàng không còn ở trạng thái khiếu nại (DISPUTED).' using errcode = '23514';
  end if;

  perform set_config('edulocker.trusted_order_rpc', 'true', true);

  if p_outcome = 'RESOLVED_BUYER' then
    v_new_order_status := 'RETURN_PENDING';
    v_new_payment_status := 'REFUNDED_DEMO';

    update public.orders
    set status = v_new_order_status, updated_at = timezone('utc', now())
    where id = v_order.id;

    update public.payment_records
    set
      status = v_new_payment_status,
      refunded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where order_id = v_order.id;
  else
    v_new_order_status := 'COMPLETED';
    v_new_payment_status := 'RELEASED_DEMO';

    update public.orders
    set
      status = v_new_order_status,
      completed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = v_order.id;

    update public.products
    set status = 'SOLD', updated_at = timezone('utc', now())
    where id = v_order.product_id;

    update public.payment_records
    set
      status = v_new_payment_status,
      released_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where order_id = v_order.id;

    perform set_config('edulocker.trusted_auth_sync', 'true', true);
    update public.profiles
    set
      completed_transactions = completed_transactions + 1,
      eco_points = eco_points + 10,
      updated_at = timezone('utc', now())
    where id in (v_order.buyer_id, v_order.seller_id);
  end if;

  update public.disputes
  set
    status = p_outcome,
    resolution = v_clean_note,
    resolved_by = v_actor_id,
    resolved_at = timezone('utc', now())
  where id = p_dispute_id;

  insert into public.order_events (
    order_id, actor_id, event_type, previous_status, new_status, metadata
  ) values (
    v_order.id,
    v_actor_id,
    case when v_new_order_status = 'COMPLETED' then 'ORDER_COMPLETED' else 'DISPUTE_OPENED' end,
    'DISPUTED',
    v_new_order_status,
    jsonb_build_object(
      'dispute_id', p_dispute_id,
      'outcome', p_outcome,
      'resolution_note', v_clean_note,
      'payment_status', v_new_payment_status
    )
  );

  perform public.create_notification_internal(
    v_order.buyer_id,
    'DISPUTE_RESOLVED',
    'Khiếu nại đơn hàng đã được giải quyết',
    'Kết quả: ' || p_outcome || ' (' || v_new_payment_status || '). ' || left(v_clean_note, 100),
    '/orders/' || v_order.id::text,
    jsonb_build_object('order_id', v_order.id, 'outcome', p_outcome)
  );

  perform public.create_notification_internal(
    v_order.seller_id,
    'DISPUTE_RESOLVED',
    'Khiếu nại đơn hàng đã được giải quyết',
    'Kết quả: ' || p_outcome || ' (' || v_new_payment_status || '). ' || left(v_clean_note, 100),
    '/orders/' || v_order.id::text,
    jsonb_build_object('order_id', v_order.id, 'outcome', p_outcome)
  );

  return jsonb_build_object(
    'dispute_id', p_dispute_id,
    'status', p_outcome,
    'order_status', v_new_order_status,
    'payment_status', v_new_payment_status
  );
end;
$$;

-- 8.8 Admin: Moderate product (HIDE / RESTORE)
create or replace function public.rpc_admin_moderate_product(
  p_product_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod public.products%rowtype;
  v_next_status text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền điều tiết sản phẩm.' using errcode = '42501';
  end if;

  if p_action not in ('HIDE', 'RESTORE') then
    raise exception 'Hành động điều tiết không hợp lệ.' using errcode = '23514';
  end if;

  select * into v_prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Sản phẩm không tồn tại.' using errcode = 'P0002';
  end if;

  if v_prod.status in ('RESERVED', 'SOLD') then
    raise exception 'Không thể thay đổi sản phẩm đang trong giao dịch hoặc đã bán.' using errcode = '23514';
  end if;

  v_next_status := case when p_action = 'HIDE' then 'HIDDEN' else 'AVAILABLE' end;

  update public.products
  set
    status = v_next_status,
    moderation_note = nullif(trim(coalesce(p_note, '')), ''),
    updated_at = timezone('utc', now())
  where id = p_product_id;

  return jsonb_build_object('product_id', p_product_id, 'status', v_next_status);
end;
$$;

-- 8.9 Admin: Toggle compartment MAINTENANCE <-> AVAILABLE (blocked if OCCUPIED/RESERVED)
create or replace function public.rpc_admin_toggle_compartment_maintenance(
  p_compartment_id text,
  p_maintenance boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp public.locker_compartments%rowtype;
  v_next_status text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền bảo trì ngăn tủ.' using errcode = '42501';
  end if;

  select * into v_comp from public.locker_compartments where id = p_compartment_id for update;
  if not found then
    raise exception 'Ngăn tủ không tồn tại.' using errcode = 'P0002';
  end if;

  if p_maintenance then
    if v_comp.status in ('OCCUPIED', 'RESERVED') then
      raise exception 'Không thể chuyển sang bảo trì khi ngăn tủ đang chứa hàng hoặc đang được giữ chỗ.' using errcode = '23514';
    end if;
    v_next_status := 'MAINTENANCE';
  else
    if v_comp.status <> 'MAINTENANCE' then
      raise exception 'Ngăn tủ không ở trạng thái bảo trì.' using errcode = '23514';
    end if;
    v_next_status := 'AVAILABLE';
  end if;

  update public.locker_compartments
  set status = v_next_status, updated_at = timezone('utc', now())
  where id = p_compartment_id;

  perform public.sync_locker_available_count(v_comp.locker_id);

  return jsonb_build_object('compartment_id', p_compartment_id, 'status', v_next_status);
end;
$$;

-- 8.10 Admin: Toggle user account status (ACTIVE / SUSPENDED)
create or replace function public.rpc_admin_set_user_status(
  p_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền thay đổi trạng thái người dùng.' using errcode = '42501';
  end if;

  if p_status not in ('ACTIVE', 'SUSPENDED') then
    raise exception 'Trạng thái tài khoản không hợp lệ.' using errcode = '23514';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Không thể tự tạm khóa tài khoản quản trị của chính mình.' using errcode = '23514';
  end if;

  perform set_config('edulocker.trusted_auth_sync', 'true', true);
  update public.profiles
  set account_status = p_status, updated_at = timezone('utc', now())
  where id = p_user_id;

  return jsonb_build_object('user_id', p_user_id, 'account_status', p_status);
end;
$$;

-- 8.11 Admin: Hide/Unhide abusive review without editing content
create or replace function public.rpc_admin_toggle_review_visibility(
  p_review_id uuid,
  p_is_hidden boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.reviews%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền ẩn/hiện đánh giá.' using errcode = '42501';
  end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'Đánh giá không tồn tại.' using errcode = 'P0002';
  end if;

  update public.reviews
  set is_hidden = p_is_hidden, updated_at = timezone('utc', now())
  where id = p_review_id;

  perform public.recalculate_seller_rating(v_review.reviewee_id);

  return jsonb_build_object('review_id', p_review_id, 'is_hidden', p_is_hidden);
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. LOCK DOWN EXECUTE PERMISSIONS ON ALL PHASE 4 RPCS
-- -----------------------------------------------------------------------------
revoke all on function public.rpc_get_or_create_conversation(uuid) from public, anon;
revoke all on function public.rpc_send_message(uuid, text) from public, anon;
revoke all on function public.rpc_mark_conversation_read(uuid) from public, anon;
revoke all on function public.rpc_submit_review(uuid, integer, integer, integer, integer, text) from public, anon;
revoke all on function public.rpc_submit_report(text, uuid, text, text) from public, anon;
revoke all on function public.rpc_admin_review_report(uuid, text, text) from public, anon;
revoke all on function public.rpc_admin_resolve_dispute(uuid, text, text) from public, anon;
revoke all on function public.rpc_admin_moderate_product(uuid, text, text) from public, anon;
revoke all on function public.rpc_admin_toggle_compartment_maintenance(text, boolean) from public, anon;
revoke all on function public.rpc_admin_set_user_status(uuid, text) from public, anon;
revoke all on function public.rpc_admin_toggle_review_visibility(uuid, boolean) from public, anon;

grant execute on function public.rpc_get_or_create_conversation(uuid) to authenticated;
grant execute on function public.rpc_send_message(uuid, text) to authenticated;
grant execute on function public.rpc_mark_conversation_read(uuid) to authenticated;
grant execute on function public.rpc_submit_review(uuid, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.rpc_submit_report(text, uuid, text, text) to authenticated;
grant execute on function public.rpc_admin_review_report(uuid, text, text) to authenticated;
grant execute on function public.rpc_admin_resolve_dispute(uuid, text, text) to authenticated;
grant execute on function public.rpc_admin_moderate_product(uuid, text, text) to authenticated;
grant execute on function public.rpc_admin_toggle_compartment_maintenance(text, boolean) to authenticated;
grant execute on function public.rpc_admin_set_user_status(uuid, text) to authenticated;
grant execute on function public.rpc_admin_toggle_review_visibility(uuid, boolean) to authenticated;

