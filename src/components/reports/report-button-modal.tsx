"use client";

import React, { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReportAction } from "@/features/reports/report-actions";
import { REPORT_REASONS } from "@/lib/validations/phase4";
import { useAppUI } from "@/hooks/use-app-ui";
import type { ReportTargetType } from "@/types";

interface ReportButtonModalProps {
  targetType: ReportTargetType;
  targetId: string;
  buttonLabel?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
}

export function ReportButtonModal({
  targetType,
  targetId,
  buttonLabel = "Báo cáo",
  variant = "outline",
  size = "sm",
  className,
}: ReportButtonModalProps) {
  const { currentUser, showToast } = useAppUI();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    if (!currentUser) {
      showToast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để gửi báo cáo vi phạm.",
        variant: "info",
      });
      return;
    }
    setErrorMsg(null);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const res = await submitReportAction({
        targetType,
        targetId,
        reason,
        description,
      });
      if (!res.success) {
        setErrorMsg(res.error ?? "Không thể gửi báo cáo.");
        return;
      }
      setOpen(false);
      setDescription("");
      showToast({
        title: "Đã gửi báo cáo",
        description: "Quản trị viên EduLocker sẽ xem xét báo cáo của bạn.",
        variant: "success",
      });
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={className}
      >
        <Flag className="h-3.5 w-3.5 text-rose-600" />
        <span>{buttonLabel}</span>
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-lg font-extrabold text-brand-navy">
                  {buttonLabel}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-slate-500">
                  Báo cáo của bạn sẽ được đội ngũ quản trị viên xem xét để giữ
                  an toàn cho cộng đồng sinh viên.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Đóng hộp thoại báo cáo"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor={`report-reason-${targetId}`}
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Lý do báo cáo
                </label>
                <select
                  id={`report-reason-${targetId}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`report-desc-${targetId}`}
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Mô tả thêm (tùy chọn)
                </label>
                <textarea
                  id={`report-desc-${targetId}`}
                  rows={3}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cung cấp thêm chi tiết giúp quản trị viên xác minh nhanh hơn..."
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

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline" size="sm">
                    Hủy
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                >
                  {isPending ? "Đang gửi..." : "Gửi báo cáo"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
