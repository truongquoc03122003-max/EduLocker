"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewSubmitSchema } from "@/lib/validations/phase4";

export async function submitReviewAction(
  orderId: string,
  payload: {
    rating: number;
    descriptionAccuracy: number;
    productConditionRating: number;
    transactionRating: number;
    comment?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const parsed = reviewSubmitSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dữ liệu đánh giá không hợp lệ.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_submit_review", {
    p_order_id: orderId,
    p_rating: parsed.data.rating,
    p_description_accuracy: parsed.data.descriptionAccuracy,
    p_product_condition_rating: parsed.data.productConditionRating,
    p_transaction_rating: parsed.data.transactionRating,
    p_comment: parsed.data.comment ?? null,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Không thể gửi đánh giá.",
    };
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

