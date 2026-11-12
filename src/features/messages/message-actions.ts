"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateMessageContent } from "@/lib/validations/phase4";

export async function getOrCreateConversationAction(productId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { data, error } = await supabase.rpc("rpc_get_or_create_conversation", {
    p_product_id: productId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Không thể mở cuộc trò chuyện.",
    };
  }

  const conversationId =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof (data as Record<string, unknown>).conversation_id === "string"
      ? ((data as Record<string, unknown>).conversation_id as string)
      : undefined;

  if (!conversationId) {
    return { success: false, error: "Không thể khởi tạo hội thoại." };
  }

  revalidatePath("/messages");
  return { success: true, conversationId };
}

export async function sendMessageAction(
  conversationId: string,
  rawContent: string,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const check = validateMessageContent(rawContent);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { data, error } = await supabase.rpc("rpc_send_message", {
    p_conversation_id: conversationId,
    p_content: check.content,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Không thể gửi tin nhắn.",
    };
  }

  const messageId =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof (data as Record<string, unknown>).id === "string"
      ? ((data as Record<string, unknown>).id as string)
      : undefined;

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { success: true, messageId };
}

export async function markConversationReadAction(
  conversationId: string,
): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.rpc("rpc_mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (!error) {
    revalidatePath("/messages");
    revalidatePath(`/messages/${conversationId}`);
  }
  return { success: !error };
}

