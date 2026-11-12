import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/products/product-skeleton";

export default function RootLoading() {
  return (
    <div className="container py-8 space-y-8">
      <Skeleton className="h-72 w-full rounded-3xl" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
