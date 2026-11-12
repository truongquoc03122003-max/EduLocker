"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportSubmitSchema } from "@/lib/validations/phase4";
import type { ReportTargetType } from "@/types";

export async function submitReportAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = reportSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Thông tin báo cáo không hợp lệ.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_submit_report", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_reason: parsed.data.reason,
    p_description: parsed.data.description ?? null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("duplicate") || msg.includes("đã gửi báo cáo")) {
      return {
        success: false,
        error: "Bạn đã gửi báo cáo cho nội dung này và đang chờ xử lý.",
      };
    }
    return {
      success: false,
      error: msg || "Không thể gửi báo cáo.",
    };
  }

  revalidatePath("/admin/reports");
  return { success: true };
}

