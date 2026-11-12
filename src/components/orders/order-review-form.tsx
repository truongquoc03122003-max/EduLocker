"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReviewAction } from "@/features/reviews/review-actions";
import { cn } from "@/lib/utils";
import type { ReviewItem } from "@/types";

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${label}: ${star} sao`}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <Star
              className={cn(
                "h-5 w-5",
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function OrderReviewSection({
  orderId,
  isBuyer,
  existingReview,
}: {
  orderId: string;
  isBuyer: boolean;
  existingReview: ReviewItem | null | undefined;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [descriptionAccuracy, setDescriptionAccuracy] = useState(5);
  const [productConditionRating, setProductConditionRating] = useState(5);
  const [transactionRating, setTransactionRating] = useState(5);
  const [comment, setComment] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (existingReview) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-emerald-950">
            Đánh giá của người mua
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-amber-600 shadow-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {existingReview.rating}/5
          </span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-emerald-900 sm:grid-cols-3">
          <span>Đúng mô tả: {existingReview.descriptionAccuracy}/5</span>
          <span>Tình trạng: {existingReview.productConditionRating}/5</span>
          <span>Giao dịch: {existingReview.transactionRating}/5</span>
        </div>
        {existingReview.comment && (
          <p className="mt-2 rounded-xl bg-white/80 p-3 text-xs leading-relaxed text-slate-700">
            “{existingReview.comment}”
          </p>
        )}
      </div>
    );
  }

  if (!isBuyer) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const res = await submitReviewAction(orderId, {
        rating,
        descriptionAccuracy,
        productConditionRating,
        transactionRating,
        comment,
      });
      if (!res.success) {
        setErrorMsg(res.error ?? "Không thể gửi đánh giá.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <div>
        <h3 className="text-sm font-extrabold text-brand-navy">
          Đánh giá người bán
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Chia sẻ trải nghiệm thực tế để giúp cộng đồng sinh viên giao dịch an
          tâm hơn.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <StarPicker
          label="Đánh giá tổng thể"
          value={rating}
          onChange={setRating}
        />
        <StarPicker
          label="Sản phẩm đúng mô tả"
          value={descriptionAccuracy}
          onChange={setDescriptionAccuracy}
        />
        <StarPicker
          label="Tình trạng sản phẩm"
          value={productConditionRating}
          onChange={setProductConditionRating}
        />
        <StarPicker
          label="Trải nghiệm giao dịch"
          value={transactionRating}
          onChange={setTransactionRating}
        />
      </div>

      <div>
        <label
          htmlFor="review-comment"
          className="mb-1 block text-xs font-semibold text-slate-700"
        >
          Nhận xét (tùy chọn)
        </label>
        <textarea
          id="review-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ví dụ: Sách còn rất mới, người bán gửi vào Smart Locker đúng hẹn..."
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>

      {errorMsg && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
        >
          {errorMsg}
        </p>
      )}

      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Đang gửi đánh giá..." : "Gửi đánh giá người bán"}
      </Button>
    </form>
  );
}

