"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/notification-actions";
import { cn, formatRelativeTimeVi } from "@/lib/utils";
import type { NotificationItem } from "@/types";

export function NotificationsList({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleOpenNotification = (item: NotificationItem) => {
    startTransition(async () => {
      if (!item.readAt) {
        await markNotificationReadAction(item.id);
      }
      if (item.href) {
        router.push(item.href);
      } else {
        router.refresh();
      }
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Bạn có{" "}
          <span className="font-bold text-brand-navy">{unreadCount}</span> thông
          báo chưa đọc.
        </p>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="h-4 w-4" />
            <span>Đánh dấu tất cả đã đọc</span>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Bell className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-brand-navy">
            Bạn chưa có thông báo mới.
          </h2>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Khi có đơn đặt mua, cập nhật Smart Locker, tin nhắn hoặc đánh giá
            mới, thông báo sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {items.map((item) => {
            const isUnread = !item.readAt;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isPending}
                onClick={() => handleOpenNotification(item)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                  isUnread && "bg-brand-blue-light/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <Circle className="h-2.5 w-2.5 shrink-0 fill-brand-blue text-brand-blue" />
                    )}
                    <p
                      className={cn(
                        "truncate text-sm",
                        isUnread
                          ? "font-extrabold text-brand-navy"
                          : "font-semibold text-slate-700",
                      )}
                    >
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {item.message}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-slate-400">
                  {formatRelativeTimeVi(item.createdAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

