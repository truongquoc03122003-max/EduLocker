"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (!error) {
    revalidatePath("/notifications");
  }
  return { success: !error };
}

export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (!error) {
    revalidatePath("/notifications");
  }
  return { success: !error };
}

