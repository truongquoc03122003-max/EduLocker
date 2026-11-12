import React from "react";
import Link from "next/link";
import { Compass, Home, SearchX } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <BrandLogo size="md" showText={true} />

      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue-light text-brand-blue">
        <SearchX className="h-8 w-8" />
      </div>

      <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-brand-blue">
        Lỗi 404 – Không tìm thấy trang
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-brand-navy sm:text-3xl">
        Trang hoặc sản phẩm bạn tìm không tồn tại
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Có thể sản phẩm này đã được sinh viên khác mua qua Smart Locker hoặc
        đường dẫn đã thay đổi.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="h-4 w-4" />
            <span>Về Trang chủ</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/products">
            <Compass className="h-4 w-4" />
            <span>Khám phá Marketplace</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
