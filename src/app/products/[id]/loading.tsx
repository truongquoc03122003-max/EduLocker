import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="container py-6">
      <Skeleton className="h-5 w-64" />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
          <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
        </div>
        <div className="space-y-4 lg:col-span-7">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
