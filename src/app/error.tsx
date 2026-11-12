"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-brand-navy sm:text-3xl">
        Đã xảy ra sự cố khi tải dữ liệu
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Hệ thống EduLocker gặp lỗi tạm thời khi xử lý yêu cầu này. Bạn vui lòng
        thử tải lại trang hoặc quay về Trang chủ.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" />
          <span>Thử lại ngay</span>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="h-4 w-4" />
            <span>Về Trang chủ</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
