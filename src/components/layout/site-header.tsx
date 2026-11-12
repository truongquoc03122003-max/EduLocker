"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  Box,
  ChevronDown,
  Compass,
  FolderKanban,
  Heart,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  PackageCheck,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppUI } from "@/hooks/use-app-ui";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function getShortName(fullName: string): string {
  const cleaned = fullName.replace(" (Tài khoản mẫu)", "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length <= 2) return cleaned;
  return parts.slice(-2).join(" ");
}

export function SiteHeader({
  unreadNotifications = 0,
}: {
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    favoriteIds,
    currentUser,
    isSupabaseConfigured,
    signOut,
  } = useAppUI();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setMobileMenuOpen(false);
    if (trimmed) {
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/products");
    }
  };

  const navItems = [
    {
      label: "Trang chủ",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Khám phá",
      href: "/products",
      icon: Compass,
      isActive: pathname.startsWith("/products"),
    },
    {
      label: "Smart Locker",
      href: "/lockers",
      icon: Box,
      isActive: pathname.startsWith("/lockers"),
    },
    {
      label: "Đơn hàng",
      href: "/orders",
      icon: PackageCheck,
      isActive: pathname.startsWith("/orders"),
    },
    {
      label: "Tin nhắn",
      href: "/messages",
      icon: MessageSquare,
      isActive: pathname.startsWith("/messages"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      {/* Top Campus Bar */}
      <div className="border-b border-slate-100 bg-brand-navy text-xs text-slate-200">
        <div className="container flex h-8 items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex h-2 w-2 rounded-full bg-brand-green" />
            <span className="font-medium text-white">
              Định hướng triển khai tại ĐH Cần Thơ (Khu II)
            </span>
            <span className="hidden text-slate-400 sm:inline">•</span>
            <span className="hidden truncate text-slate-300 sm:inline">
              Trạm mô phỏng / Vị trí đề xuất: Ký túc xá A &amp; Trung tâm Học
              liệu
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
              <Sparkles className="h-3 w-3" />
              {isSupabaseConfigured
                ? "Supabase Connected"
                : "MVP Demo – Dữ liệu mẫu"}
            </span>
            <span className="hidden items-center gap-1 text-emerald-300 lg:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Không qua shipper – tiết kiệm phí giao nhận nội khu
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container flex h-16 items-center justify-between gap-3 py-2.5 sm:h-[72px]">
        {/* Left: Official Brand Logo */}
        <div className="flex shrink-0 items-center gap-4">
          <BrandLogo size="sm" showText={true} priority={true} />
        </div>

        {/* Center-Left: Search Bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Tìm kiếm sản phẩm trên EduLocker"
          className="hidden max-w-md flex-1 lg:flex"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm giáo trình, Casio, đèn bàn, đồ KTX..."
              aria-label="Từ khóa tìm kiếm"
              className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 pl-10 pr-20 text-sm focus:bg-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-hover"
            >
              Tìm
            </button>
          </div>
        </form>

        {/* Center-Right: Desktop Navigation */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden items-center gap-1 xl:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  item.isActive
                    ? "bg-brand-blue-light text-brand-blue"
                    : "text-slate-700 hover:bg-slate-100 hover:text-brand-navy",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <Link
            href="/favorites"
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              pathname === "/favorites"
                ? "bg-brand-blue-light text-brand-blue"
                : "text-slate-700 hover:bg-slate-100 hover:text-brand-navy",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                favoriteIds.length > 0 && "fill-rose-500 text-rose-500",
              )}
            />
            <span>Yêu thích</span>
            {favoriteIds.length > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                {favoriteIds.length}
              </span>
            )}
          </Link>
        </nav>

        {/* Right: CTA "Đăng bán" & Auth / User Menu + Mobile Trigger */}
        <div className="flex shrink-0 items-center gap-2">
          {currentUser && (
            <Link
              href="/notifications"
              aria-label={`Thông báo (${unreadNotifications} chưa đọc)`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          {/* Compact Favorites link for tablet */}
          <Link
            href="/favorites"
            aria-label={`Sản phẩm yêu thích (${favoriteIds.length})`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 xl:hidden"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                favoriteIds.length > 0 && "fill-rose-500 text-rose-500",
              )}
            />
            {favoriteIds.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {favoriteIds.length}
              </span>
            )}
          </Link>

          <Button asChild className="hidden sm:inline-flex">
            <Link href="/sell">
              <PlusCircle className="h-4 w-4" />
              <span>Đăng bán</span>
            </Link>
          </Button>

          {currentUser ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Mở menu tài khoản"
                  className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-1.5 pr-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:inline-flex"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">
                    {getInitials(currentUser.fullName)}
                  </span>
                  <span className="hidden flex-col leading-none md:flex">
                    <span className="max-w-[110px] truncate text-xs font-bold text-brand-navy">
                      {getShortName(currentUser.fullName)}
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium text-brand-green">
                      {currentUser.cohort} •{" "}
                      {currentUser.emailVerified
                        ? "Email đã xác minh"
                        : "Chờ xác minh"}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-brand-navy">
                      {currentUser.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {currentUser.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/profile"
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 hover:text-brand-navy"
                      >
                        <User className="h-4 w-4 text-brand-blue" />
                        <span>Hồ sơ</span>
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href="/orders"
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 hover:text-brand-navy"
                      >
                        <PackageCheck className="h-4 w-4 text-brand-blue" />
                        <span>Đơn hàng của tôi</span>
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href="/my-products"
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 hover:text-brand-navy"
                      >
                        <FolderKanban className="h-4 w-4 text-brand-blue" />
                        <span>Sản phẩm của tôi</span>
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href="/favorites"
                        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 hover:text-brand-navy"
                      >
                        <span className="flex items-center gap-2.5">
                          <Heart className="h-4 w-4 text-rose-500" />
                          <span>Yêu thích</span>
                        </span>
                        <Badge variant="secondary">{favoriteIds.length}</Badge>
                      </Link>
                    </DropdownMenu.Item>

                    {currentUser.role === "admin" && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/admin"
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-brand-navy outline-none hover:bg-brand-blue-light/60"
                        >
                          <LayoutDashboard className="h-4 w-4 text-brand-green" />
                          <span>Quản trị</span>
                        </Link>
                      </DropdownMenu.Item>
                    )}
                  </div>

                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />

                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      signOut();
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 outline-none hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Đăng nhập</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="hidden md:inline-flex"
              >
                <Link href="/register">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Đăng ký</span>
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="xl:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-xl xl:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bạn đang tìm giáo trình, máy tính hay đồ KTX?"
                aria-label="Tìm kiếm trên di động"
                className="pl-10 pr-16"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white"
              >
                Tìm
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    item.isActive
                      ? "bg-brand-blue-light text-brand-blue"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/favorites"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                pathname === "/favorites"
                  ? "bg-brand-blue-light text-brand-blue"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <span className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-rose-500" />
                <span>Sản phẩm yêu thích</span>
              </span>
              <Badge variant="secondary">{favoriteIds.length}</Badge>
            </Link>

            {currentUser ? (
              <>
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-brand-blue" />
                    <span>Thông báo</span>
                  </span>
                  {unreadNotifications > 0 && (
                    <Badge variant="default">{unreadNotifications}</Badge>
                  )}
                </Link>
                {currentUser.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-brand-navy hover:bg-slate-100"
                  >
                    <LayoutDashboard className="h-4 w-4 text-brand-green" />
                    <span>Quản trị</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <User className="h-4 w-4 text-brand-blue" />
                  <span>Hồ sơ ({getShortName(currentUser.fullName)})</span>
                </Link>
                <Link
                  href="/my-products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <FolderKanban className="h-4 w-4 text-brand-blue" />
                  <span>Sản phẩm của tôi</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  asChild
                  variant="outline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span>Đăng nhập</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/register">
                    <UserPlus className="h-4 w-4" />
                    <span>Đăng ký</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <Button
              asChild
              className="w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href="/sell">
                <PlusCircle className="h-4 w-4" />
                <span>Đăng bán sản phẩm</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
