import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import {
  fetchConversationMessages,
  fetchUserConversations,
} from "@/features/messages/message-repository";

export const metadata: Metadata = {
  title: "Chi Tiết Cuộc Trò Chuyện – EduLocker",
};

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { userProfile } = await getCurrentUserProfile();
  if (!userProfile) {
    redirect(`/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`);
  }

  const [conversations, thread] = await Promise.all([
    fetchUserConversations(userProfile.id),
    fetchConversationMessages(conversationId, userProfile.id),
  ]);

  if (!thread.authorized) {
    notFound();
  }

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs
        items={[
          { label: "Tin nhắn", href: "/messages" },
          { label: "Cuộc trò chuyện" },
        ]}
      />
      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Tin nhắn trao đổi sản phẩm
        </h1>
      </div>

      <MessagesWorkspace
        conversations={conversations}
        activeConversationId={conversationId}
        initialMessages={thread.messages}
        currentUserId={userProfile.id}
      />
    </div>
  );
}

