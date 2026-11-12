"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportButtonModal } from "@/components/reports/report-button-modal";
import {
  markConversationReadAction,
  sendMessageAction,
} from "@/features/messages/message-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, formatRelativeTimeVi, formatVND } from "@/lib/utils";
import type { ConversationSummary, MessageItem } from "@/types";

interface MessagesWorkspaceProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  initialMessages: MessageItem[];
  currentUserId: string;
}

export function MessagesWorkspace({
  conversations,
  activeConversationId,
  initialMessages,
  currentUserId,
}: MessagesWorkspaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, activeConversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!activeConversationId) return;
    markConversationReadAction(activeConversationId).catch(() => {});

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`conv-messages-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            read_at: string | null;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                content: row.content,
                readAt: row.read_at,
                createdAt: row.created_at,
              },
            ];
          });
          if (row.sender_id !== currentUserId) {
            markConversationReadAction(activeConversationId).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUserId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await sendMessageAction(activeConversationId, trimmed);
      if (!res.success) {
        setErrorMsg(res.error ?? "Không thể gửi tin nhắn.");
        return;
      }
      setDraft("");
      router.refresh();
    });
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-base font-bold text-brand-navy">
          Bạn chưa có cuộc trò chuyện nào.
        </h2>
        <p className="mt-1 max-w-md text-xs text-slate-500">
          Hãy vào trang chi tiết một sản phẩm và bấm{" "}
          <strong>Nhắn người bán</strong> để trao đổi thêm trước khi đặt qua
          Smart Locker.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/products">Khám phá sản phẩm</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[540px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-12">
      {/* Left Panel: Conversation List */}
      <aside
        className={cn(
          "border-b border-slate-200 md:col-span-5 md:border-b-0 md:border-r lg:col-span-4",
          activeConversation ? "hidden md:block" : "block",
        )}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-extrabold text-brand-navy">
            Hội thoại ({conversations.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-100 overflow-y-auto md:max-h-[560px]">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                  isActive && "bg-brand-blue-light/50",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-xs font-extrabold text-white">
                  {conv.otherParticipant.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-brand-navy">
                      {conv.otherParticipant.fullName}
                    </p>
                    {conv.lastMessageAt && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatRelativeTimeVi(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] font-semibold text-brand-blue">
                    {conv.product.title}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-slate-500">
                      {conv.lastMessage
                        ? conv.lastMessage.content
                        : "Chưa có tin nhắn"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue px-1.5 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Right Panel: Chat Thread */}
      <section
        className={cn(
          "flex flex-col md:col-span-7 lg:col-span-8",
          !activeConversation ? "hidden md:flex" : "flex",
        )}
      >
        {activeConversation ? (
          <>
            {/* Conversation Header + Product Preview */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Link
                  href="/messages"
                  aria-label="Quay lại danh sách hội thoại"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/profile/${activeConversation.otherParticipant.id}`}
                    className="truncate text-sm font-extrabold text-brand-navy hover:text-brand-blue hover:underline"
                  >
                    {activeConversation.otherParticipant.fullName}
                  </Link>
                  <p className="truncate text-[11px] text-slate-500">
                    {activeConversation.otherParticipant.cohort} •{" "}
                    {activeConversation.otherParticipant.universityName}
                  </p>
                </div>
              </div>

              <ReportButtonModal
                targetType="USER"
                targetId={activeConversation.otherParticipant.id}
                buttonLabel="Báo cáo"
                variant="ghost"
              />
            </div>

            {/* Product Preview Bar */}
            <Link
              href={`/products/${activeConversation.product.slug}`}
              className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <Image
                    src={activeConversation.product.thumbnailUrl}
                    alt={activeConversation.product.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-brand-navy">
                    {activeConversation.product.title}
                  </p>
                  <p className="text-xs font-extrabold text-brand-blue">
                    {formatVND(activeConversation.product.price)}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-blue-light px-2.5 py-1 text-[11px] font-bold text-brand-blue">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Xem sản phẩm</span>
              </span>
            </Link>

            {/* Messages Scroll Area */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-4 max-h-[380px] min-h-[320px]">
              {messages.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-400">
                  Hãy gửi lời chào để bắt đầu trao đổi về sản phẩm này.
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col",
                        isMine ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                          isMine
                            ? "bg-brand-blue text-white"
                            : "border border-slate-200 bg-white text-slate-800",
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="mt-1 px-1 text-[10px] text-slate-400">
                        {formatRelativeTimeVi(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="border-t border-slate-200 bg-white p-3"
            >
              {errorMsg && (
                <p
                  role="alert"
                  className="mb-2 text-xs font-semibold text-rose-600"
                >
                  {errorMsg}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={1000}
                  placeholder="Nhập tin nhắn (tối đa 1000 ký tự)..."
                  aria-label="Nội dung tin nhắn"
                  disabled={isPending}
                />
                <Button
                  type="submit"
                  disabled={isPending || draft.trim().length === 0}
                  size="default"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Gửi</span>
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
            <MessageSquare className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-brand-navy">
              Chọn một cuộc trò chuyện bên trái để bắt đầu nhắn tin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

