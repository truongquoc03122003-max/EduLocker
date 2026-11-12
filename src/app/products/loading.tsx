import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/products/product-skeleton";

export default function ProductsLoading() {
  return (
    <div className="container py-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-3 h-9 w-80" />
      <Skeleton className="mt-2 h-4 w-96" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      <div className="mt-6">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
