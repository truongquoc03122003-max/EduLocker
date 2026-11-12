import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-600 transition-colors hover:text-brand-blue"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Trang chủ</span>
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-slate-600 transition-colors hover:text-brand-blue"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="line-clamp-1 max-w-[260px] font-semibold text-brand-navy sm:max-w-md"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
