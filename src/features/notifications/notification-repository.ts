import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { NotificationItem, NotificationType } from "@/types";

export async function fetchUnreadNotificationCount(
  userId: string,
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return count ?? 0;
}

export async function fetchUserNotifications(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<{
  items: NotificationItem[];
  total: number;
  unreadCount: number;
}> {
  if (!isSupabaseConfigured()) {
    return { items: [], total: 0, unreadCount: 0 };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0, unreadCount: 0 };

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const [{ data, count }, { count: unread }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  const items: NotificationItem[] = (data ?? []).map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    href: n.href,
    metadata:
      n.metadata && typeof n.metadata === "object" && !Array.isArray(n.metadata)
        ? (n.metadata as Record<string, unknown>)
        : {},
    readAt: n.read_at,
    createdAt: n.created_at,
  }));

  return {
    items,
    total: count ?? 0,
    unreadCount: unread ?? 0,
  };
}

