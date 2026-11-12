"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Box,
  Flag,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/products", label: "Sản phẩm", icon: ShoppingBag },
  { href: "/admin/orders", label: "Đơn hàng", icon: Package },
  { href: "/admin/lockers", label: "Smart Locker", icon: Box },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/statistics", label: "Statistics", icon: BarChart3 },
];

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container py-6 pb-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-brand-navy px-5 py-4 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            EduLocker Admin Console
          </p>
          <h1 className="text-lg font-extrabold sm:text-xl">
            Quản trị &amp; Điều tiết Hệ thống
          </h1>
        </div>
        <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100">
          Quản trị viên: {adminName}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar (Desktop) + Scrollable Pills (Mobile/Tablet) */}
        <aside className="lg:col-span-3">
          <nav
            aria-label="Điều hướng quản trị"
            className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-col"
          >
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors sm:text-sm",
                    isActive
                      ? "bg-brand-blue text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-brand-navy",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Admin Content */}
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}

