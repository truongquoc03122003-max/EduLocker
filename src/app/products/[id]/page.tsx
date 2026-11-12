import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductDetailView } from "@/components/products/product-detail-view";
import { fetchProductByIdOrSlug } from "@/features/marketplace/product-repository";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { product } = await fetchProductByIdOrSlug(id);

  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm",
    };
  }

  return {
    title: `${product.title} – ${product.universityName}`,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const { product, relatedProducts } = await fetchProductByIdOrSlug(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="container py-4">
      <Breadcrumbs
        items={[
          { label: "Khám phá", href: "/products" },
          {
            label: product.categoryName,
            href: `/products?category=${product.categorySlug}`,
          },
          { label: product.title },
        ]}
      />

      <ProductDetailView product={product} relatedProducts={relatedProducts} />
    </div>
  );
}
