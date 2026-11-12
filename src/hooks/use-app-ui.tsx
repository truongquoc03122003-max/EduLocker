"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS } from "@/features/marketplace/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mergeFavoriteIds } from "@/lib/validations/product";
import type { AuthenticatedUserProfile } from "@/types";
import Link from "next/link";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "info";
}

export interface PhaseFeatureModalData {
  title: string;
  phaseBadge: string;
  summary: string;
  steps?: string[];
  ctaHref?: string;
  ctaLabel?: string;
}

interface AppUIContextValue {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string, productTitle?: string) => void;
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  openPhaseModal: (data: PhaseFeatureModalData) => void;
  closePhaseModal: () => void;
  currentUser: AuthenticatedUserProfile | null;
  isSupabaseConfigured: boolean;
  signOut: () => Promise<void>;
}

const AppUIContext = createContext<AppUIContextValue | undefined>(undefined);

const FAVORITES_STORAGE_KEY = "edulocker_favorites_v1";
const VALID_MOCK_PRODUCT_IDS = new Set(PRODUCTS.map((p) => p.id));
const DEFAULT_FAVORITE_IDS = [
  "prod-giao-trinh-giai-tich",
  "prod-may-tinh-casio",
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProductIdOrUuid(id: string): boolean {
  return VALID_MOCK_PRODUCT_IDS.has(id) || UUID_REGEX.test(id);
}

export function sanitizeFavoriteIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_FAVORITE_IDS;
  }
  const uniqueValidIds: string[] = [];
  for (const item of raw) {
    if (
      typeof item === "string" &&
      isValidProductIdOrUuid(item) &&
      !uniqueValidIds.includes(item)
    ) {
      uniqueValidIds.push(item);
    }
  }
  return uniqueValidIds;
}

export function AppUIProvider({
  children,
  initialUser = null,
  isSupabaseConfigured = false,
}: {
  children: React.ReactNode;
  initialUser?: AuthenticatedUserProfile | null;
  isSupabaseConfigured?: boolean;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] =
    useState<AuthenticatedUserProfile | null>(initialUser);
  const [favoriteIds, setFavoriteIds] =
    useState<string[]>(DEFAULT_FAVORITE_IDS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalData, setModalData] = useState<PhaseFeatureModalData | null>(
    null,
  );

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // Load & migrate favorites:
  // - Anonymous user: load from localStorage
  // - Authenticated user: merge localStorage favorites into Supabase `favorites` table, deduplicate, and sync
  useEffect(() => {
    let isCancelled = false;

    async function syncFavorites() {
      let localList: string[] = DEFAULT_FAVORITE_IDS;
      try {
        const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localList = sanitizeFavoriteIds(parsed);
          }
        }
      } catch {
        // Ignore storage error
      }

      if (!currentUser || !isSupabaseConfigured) {
        if (!isCancelled) {
          setFavoriteIds(localList);
        }
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        if (!isCancelled) {
          setFavoriteIds(localList);
        }
        return;
      }

      try {
        const { data: rows } = await supabase
          .from("favorites")
          .select("product_id")
          .eq("user_id", currentUser.id);

        const remoteIds = (rows ?? []).map((r) => r.product_id);
        const merged = mergeFavoriteIds(localList, remoteIds);

        // Những sản phẩm có UUID thật trong localStorage chưa có trên DB sẽ được merge lên bảng favorites
        const newUuidToInsert = localList.filter(
          (id) => UUID_REGEX.test(id) && !remoteIds.includes(id),
        );

        if (newUuidToInsert.length > 0) {
          await supabase.from("favorites").upsert(
            newUuidToInsert.map((pid) => ({
              user_id: currentUser.id,
              product_id: pid,
            })),
            { onConflict: "user_id,product_id", ignoreDuplicates: true },
          );
        }

        if (!isCancelled) {
          setFavoriteIds(merged);
          window.localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify(merged),
          );
        }
      } catch {
        if (!isCancelled) {
          setFavoriteIds(localList);
        }
      }
    }

    syncFavorites();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, isSupabaseConfigured]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (productId: string, productTitle?: string) => {
      if (!isValidProductIdOrUuid(productId)) return;

      setFavoriteIds((prev) => {
        const exists = prev.includes(productId);
        const next = exists
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];

        try {
          window.localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch {
          // Ignore storage error
        }

        // Nếu đã đăng nhập và sản phẩm có UUID trong DB -> lưu/xóa trực tiếp trên Supabase
        if (currentUser && isSupabaseConfigured && UUID_REGEX.test(productId)) {
          const supabase = createSupabaseBrowserClient();
          if (supabase) {
            if (exists) {
              supabase
                .from("favorites")
                .delete()
                .eq("user_id", currentUser.id)
                .eq("product_id", productId)
                .then(() => {});
            } else {
              supabase
                .from("favorites")
                .upsert(
                  { user_id: currentUser.id, product_id: productId },
                  { onConflict: "user_id,product_id", ignoreDuplicates: true },
                )
                .then(() => {});
            }
          }
        }

        setTimeout(() => {
          showToast({
            title: exists
              ? "Đã bỏ lưu khỏi danh sách yêu thích"
              : "Đã lưu vào danh sách yêu thích",
            description: productTitle ? `Sản phẩm: ${productTitle}` : undefined,
            variant: exists ? "info" : "success",
          });
        }, 0);

        return next;
      });
    },
    [currentUser, isSupabaseConfigured, showToast],
  );

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    showToast({
      title: "Đã đăng xuất tài khoản",
      description: "Hẹn gặp lại bạn trên EduLocker.",
      variant: "info",
    });
    router.push("/");
    router.refresh();
  }, [router, showToast]);

  const openPhaseModal = useCallback((data: PhaseFeatureModalData) => {
    setModalData(data);
  }, []);

  const closePhaseModal = useCallback(() => {
    setModalData(null);
  }, []);

  const value = useMemo(
    () => ({
      favoriteIds,
      isFavorite,
      toggleFavorite,
      showToast,
      openPhaseModal,
      closePhaseModal,
      currentUser,
      isSupabaseConfigured,
      signOut,
    }),
    [
      favoriteIds,
      isFavorite,
      toggleFavorite,
      showToast,
      openPhaseModal,
      closePhaseModal,
      currentUser,
      isSupabaseConfigured,
      signOut,
    ],
  );

  return (
    <AppUIContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg transition-all"
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
            )}
            <div className="flex-1 text-sm">
              <p className="font-semibold text-brand-navy">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              aria-label="Đóng thông báo"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Accessible Phase / Feature Transparency Modal via Radix Dialog */}
      <Dialog.Root
        open={Boolean(modalData)}
        onOpenChange={(open) => {
          if (!open) closePhaseModal();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" />
          {modalData && (
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none">
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Đóng hộp thoại"
                  className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>

              <div className="flex flex-wrap items-center gap-2 pr-8">
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {modalData.phaseBadge}
                </Badge>
                <Badge variant="eco" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Minh bạch lộ trình MVP
                </Badge>
              </div>

              <Dialog.Title className="mt-3 text-xl font-bold text-brand-navy">
                {modalData.title}
              </Dialog.Title>

              <Dialog.Description className="mt-2 text-sm leading-relaxed text-slate-600">
                {modalData.summary}
              </Dialog.Description>

              {modalData.steps && modalData.steps.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy">
                    <Lock className="h-3.5 w-3.5 text-brand-blue" />
                    Quy trình hoạt động trên hệ thống EduLocker:
                  </p>
                  <ol className="mt-2.5 space-y-2 text-xs text-slate-700">
                    {modalData.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
                <Dialog.Close asChild>
                  <Button variant="outline">Đã hiểu</Button>
                </Dialog.Close>
                {modalData.ctaHref && modalData.ctaLabel && (
                  <Button asChild onClick={closePhaseModal}>
                    <Link href={modalData.ctaHref}>{modalData.ctaLabel}</Link>
                  </Button>
                )}
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </AppUIContext.Provider>
  );
}

export function useAppUI() {
  const ctx = useContext(AppUIContext);
  if (!ctx) {
    throw new Error("useAppUI must be used within AppUIProvider");
  }
  return ctx;
}
