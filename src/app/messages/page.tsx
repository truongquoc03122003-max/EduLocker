import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import {
  fetchConversationMessages,
  fetchUserConversations,
} from "@/features/messages/message-repository";

export const metadata: Metadata = {
  title: "Tin Nhắn Trao Đổi – EduLocker",
  description:
    "Trao đổi trực tiếp giữa người mua và người bán gắn kèm sản phẩm sinh viên trên EduLocker.",
};

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { userProfile } = await getCurrentUserProfile();
  if (!userProfile) {
    redirect("/login?next=/messages");
  }

  const conversations = await fetchUserConversations(userProfile.id);
  const firstId = conversations[0]?.id ?? null;
  const initialMessages = firstId
    ? (await fetchConversationMessages(firstId, userProfile.id)).messages
    : [];

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Tin nhắn" }]} />
      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Tin nhắn trao đổi sản phẩm
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Nhắn tin trực tiếp với người mua/người bán gắn liền từng sản phẩm cụ
          thể.
        </p>
      </div>

      <MessagesWorkspace
        conversations={conversations}
        activeConversationId={firstId}
        initialMessages={initialMessages}
        currentUserId={userProfile.id}
      />
    </div>
  );
}

