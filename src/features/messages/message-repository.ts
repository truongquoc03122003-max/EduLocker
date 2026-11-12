import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { UNIVERSITIES } from "@/features/marketplace/mock-data";
import type {
  ConversationSummary,
  MessageItem,
  ProductStatus,
} from "@/types";

function getUniShort(uniId?: string | null): string {
  return (
    UNIVERSITIES.find((u) => u.id === uniId)?.shortName ?? "ĐH Cần Thơ (CTU)"
  );
}

export async function fetchUserConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: convRows, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !convRows || convRows.length === 0) return [];

  const productIds = Array.from(new Set(convRows.map((c) => c.product_id)));
  const userIds = Array.from(
    new Set(convRows.flatMap((c) => [c.buyer_id, c.seller_id])),
  );
  const convIds = convRows.map((c) => c.id);

  const [
    { data: products },
    { data: images },
    { data: profiles },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from("products").select("*").in("id", productIds),
    supabase
      .from("product_images")
      .select("product_id, image_url, display_order")
      .in("product_id", productIds)
      .order("display_order", { ascending: true }),
    supabase.from("profiles").select("*").in("id", userIds),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const thumbMap = new Map<string, string>();
  for (const img of images ?? []) {
    if (!thumbMap.has(img.product_id)) {
      thumbMap.set(img.product_id, img.image_url);
    }
  }
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const lastMsgMap = new Map<
    string,
    { id: string; content: string; senderId: string; createdAt: string }
  >();
  const unreadMap = new Map<string, number>();

  for (const m of recentMessages ?? []) {
    if (!lastMsgMap.has(m.conversation_id)) {
      lastMsgMap.set(m.conversation_id, {
        id: m.id,
        content: m.content,
        senderId: m.sender_id,
        createdAt: m.created_at,
      });
    }
    if (m.sender_id !== userId && m.read_at === null) {
      unreadMap.set(
        m.conversation_id,
        (unreadMap.get(m.conversation_id) ?? 0) + 1,
      );
    }
  }

  return convRows.map((c) => {
    const prod = productMap.get(c.product_id);
    const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
    const other = profileMap.get(otherId);
    return {
      id: c.id,
      productId: c.product_id,
      buyerId: c.buyer_id,
      sellerId: c.seller_id,
      lastMessageAt: c.last_message_at,
      createdAt: c.created_at,
      product: {
        id: prod?.id ?? c.product_id,
        slug: prod?.slug ?? c.product_id,
        title: prod?.title ?? "Sản phẩm sinh viên",
        price: prod?.price ?? 0,
        status: (prod?.status ?? "AVAILABLE") as ProductStatus,
        thumbnailUrl: thumbMap.get(c.product_id) ?? "/logo-edulocker.png",
      },
      otherParticipant: {
        id: otherId,
        fullName: other?.full_name ?? "Sinh viên EduLocker",
        cohort: other?.cohort ?? "K50",
        universityName: getUniShort(other?.university_id),
        role: other?.role ?? "student",
      },
      lastMessage: lastMsgMap.get(c.id) ?? null,
      unreadCount: unreadMap.get(c.id) ?? 0,
    };
  });
}

export async function fetchConversationMessages(
  conversationId: string,
  userId: string,
  limit = 40,
): Promise<{ authorized: boolean; messages: MessageItem[] }> {
  if (!isSupabaseConfigured()) return { authorized: false, messages: [] };
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      conversationId,
    );
  if (!isUuid) return { authorized: false, messages: [] };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { authorized: false, messages: [] };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (
    !conv ||
    (conv.buyer_id !== userId && conv.seller_id !== userId)
  ) {
    return { authorized: false, messages: [] };
  }

  const { data: rows } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const messages: MessageItem[] = (rows ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      readAt: m.read_at,
      createdAt: m.created_at,
    }));

  return { authorized: true, messages };
}

