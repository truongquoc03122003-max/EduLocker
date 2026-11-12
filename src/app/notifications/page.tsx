import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { fetchUserNotifications } from "@/features/notifications/notification-repository";

export const metadata: Metadata = {
  title: "Thông Báo – EduLocker",
  description: "Theo dõi thông báo đơn hàng, Smart Locker, tin nhắn và đánh giá.",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { userProfile } = await getCurrentUserProfile();
  if (!userProfile) {
    redirect("/login?next=/notifications");
  }

  const { items, unreadCount } = await fetchUserNotifications(
    userProfile.id,
    1,
    30,
  );

  return (
    <div className="container max-w-3xl py-4 pb-14">
      <Breadcrumbs items={[{ label: "Thông báo" }]} />
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Thông báo của bạn
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cập nhật theo thời gian thực về đơn hàng, Smart Locker, tin nhắn và
          đánh giá.
        </p>
      </div>

      <NotificationsList items={items} unreadCount={unreadCount} />
    </div>
  );
}

