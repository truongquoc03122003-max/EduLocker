"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  CheckCircle2,
  GraduationCap,
  ImagePlus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createProductAction,
  updateProductAction,
} from "@/features/marketplace/product-actions";
import {
  getAllCategories,
  getAllCohorts,
  getAllCourses,
  getAllMajors,
  getAllUniversities,
  getLockerLocations,
} from "@/features/marketplace/product-service";
import {
  MAX_PRODUCT_IMAGES,
  productCreateSchema,
} from "@/lib/validations/product";
import type { CategorySlug, Product, ProductCondition } from "@/types";

interface ProductFormProps {
  mode: "create" | "edit";
  initialProduct?: Product;
  defaultUniversityId?: string | null;
  defaultMajorId?: string | null;
  defaultCohort?: string | null;
}

const CONDITION_ITEMS: {
  value: ProductCondition;
  label: string;
  defaultPercent: number;
}[] = [
  { value: "LIKE_NEW", label: "Như mới (95–99%)", defaultPercent: 95 },
  { value: "GOOD", label: "Còn tốt (85–94%)", defaultPercent: 90 },
  { value: "FAIR", label: "Khá tốt (75–84%)", defaultPercent: 80 },
  { value: "WELL_USED", label: "Đã qua sử dụng (50–74%)", defaultPercent: 70 },
];

export function ProductForm({
  mode,
  initialProduct,
  defaultUniversityId,
  defaultMajorId,
  defaultCohort,
}: ProductFormProps) {
  const router = useRouter();

  const categories = useMemo(() => getAllCategories(), []);
  const universities = useMemo(() => getAllUniversities(), []);
  const cohorts = useMemo(() => getAllCohorts(), []);
  const lockers = useMemo(() => getLockerLocations(), []);

  const [title, setTitle] = useState(initialProduct?.title ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description ?? "",
  );
  const [categorySlug, setCategorySlug] = useState<CategorySlug>(
    initialProduct?.categorySlug ?? "giao-trinh",
  );
  const [condition, setCondition] = useState<ProductCondition>(
    initialProduct?.condition ?? "GOOD",
  );
  const [conditionPercent, setConditionPercent] = useState<number>(
    initialProduct?.conditionPercent ?? 90,
  );
  const [price, setPrice] = useState<string>(
    initialProduct ? String(initialProduct.price) : "",
  );
  const [originalPrice, setOriginalPrice] = useState<string>(
    initialProduct?.originalPrice ? String(initialProduct.originalPrice) : "",
  );
  const [universityId, setUniversityId] = useState<string>(
    initialProduct?.universityId ?? defaultUniversityId ?? "uni-ctu",
  );
  const [majorId, setMajorId] = useState<string>(
    initialProduct?.majorId ?? defaultMajorId ?? "major-cntt",
  );
  const [courseId, setCourseId] = useState<string>(
    initialProduct?.courseId ?? "",
  );
  const [cohort, setCohort] = useState<string>(
    initialProduct?.cohort ?? defaultCohort ?? "K49",
  );
  const [preferredLockerId, setPreferredLockerId] = useState<string>(
    initialProduct?.preferredLockerId ?? lockers[0]?.id ?? "locker-thu-vien",
  );

  const [existingImages, setExistingImages] = useState<string[]>(
    initialProduct?.images.map((img) => img.url) ?? [],
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredMajors = useMemo(
    () => getAllMajors(universityId),
    [universityId],
  );
  const filteredCourses = useMemo(
    () => getAllCourses(majorId || "all", universityId),
    [majorId, universityId],
  );

  const handleUniversityChange = (nextUniId: string) => {
    setUniversityId(nextUniId);
    const nextMajors = getAllMajors(nextUniId);
    if (nextMajors.length > 0) {
      setMajorId(nextMajors[0].id);
      setCourseId("");
    } else {
      setMajorId("");
      setCourseId("");
    }
  };

  const handleMajorChange = (nextMajorId: string) => {
    setMajorId(nextMajorId);
    setCourseId("");
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const incoming = Array.from(fileList);
    const totalCount =
      existingImages.length + selectedFiles.length + incoming.length;

    if (totalCount > MAX_PRODUCT_IMAGES) {
      setErrorMessage(
        `Bạn chỉ có thể tải lên tối đa ${MAX_PRODUCT_IMAGES} ảnh cho mỗi sản phẩm.`,
      );
      return;
    }

    const nextFiles = [...selectedFiles, ...incoming];
    setSelectedFiles(nextFiles);
    setPreviewUrls(nextFiles.map((f) => URL.createObjectURL(f)));
    setErrorMessage(null);
  };

  const removeSelectedFile = (index: number) => {
    const nextFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(nextFiles);
    setPreviewUrls(nextFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericPrice = Number(price);
    const numericOriginalPrice = originalPrice
      ? Number(originalPrice)
      : undefined;

    const parsed = productCreateSchema.safeParse({
      title,
      description,
      categorySlug,
      condition,
      conditionPercent: Number(conditionPercent),
      price: numericPrice,
      originalPrice: numericOriginalPrice,
      universityId,
      majorId,
      courseId: courseId || undefined,
      cohort,
      preferredLockerId,
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ??
          "Vui lòng kiểm tra lại thông tin sản phẩm.",
      );
      return;
    }

    if (existingImages.length + selectedFiles.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 ảnh sản phẩm (JPG, PNG, WEBP).");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", parsed.data.title);
      formData.set("description", parsed.data.description);
      formData.set("categorySlug", parsed.data.categorySlug);
      formData.set("condition", parsed.data.condition);
      formData.set("conditionPercent", String(parsed.data.conditionPercent));
      formData.set("price", String(parsed.data.price));
      if (parsed.data.originalPrice !== undefined) {
        formData.set("originalPrice", String(parsed.data.originalPrice));
      }
      formData.set("universityId", parsed.data.universityId);
      if (parsed.data.majorId) formData.set("majorId", parsed.data.majorId);
      if (parsed.data.courseId) formData.set("courseId", parsed.data.courseId);
      if (parsed.data.cohort) formData.set("cohort", parsed.data.cohort);
      formData.set("preferredLockerId", parsed.data.preferredLockerId);

      existingImages.forEach((url) => formData.append("existingImages", url));
      selectedFiles.forEach((file) => formData.append("images", file));

      const response =
        mode === "create"
          ? await createProductAction(formData)
          : await updateProductAction(initialProduct!.id, formData);

      if (!response.success) {
        setErrorMessage(response.error ?? "Không thể lưu sản phẩm.");
        return;
      }

      if ("slug" in response && response.slug) {
        router.push(`/products/${response.slug}`);
      } else if (response.productId) {
        router.push(`/products/${response.productId}`);
      } else {
        router.push("/my-products");
      }
      router.refresh();
    } catch {
      setErrorMessage("Đã xảy ra lỗi khi tải lên sản phẩm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
      noValidate
    >
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Section 1: Basic Info */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-brand-navy">
          1. Thông tin sản phẩm &amp; Danh mục
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="sell-title"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Tên sản phẩm / Giáo trình (10–120 ký tự) *
            </label>
            <Input
              id="sell-title"
              type="text"
              minLength={10}
              maxLength={120}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Giáo trình Cấu trúc Dữ liệu & Giải thuật (CT177) – Bản in CTU"
              className="mt-1.5"
            />
          </div>

          <div>
            <label
              htmlFor="sell-category"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Danh mục *
            </label>
            <select
              id="sell-category"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value as CategorySlug)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="sell-description"
            className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
          >
            Mô tả chi tiết tình trạng &amp; phụ kiện kèm theo (25–2000 ký tự) *
          </label>
          <textarea
            id="sell-description"
            rows={4}
            minLength={25}
            maxLength={2000}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả rõ số trang, ghi chú bên trong sách, năm xuất bản hoặc phụ kiện đi kèm để người mua yên tâm nhận qua Smart Locker (tối thiểu 25 ký tự)..."
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
      </div>

      {/* Section 2: Academic Hierarchy */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
            <GraduationCap className="h-5 w-5 text-brand-blue" />
            2. Gắn thẻ Cây đào tạo (Trường → Ngành → Môn học → Khóa)
          </h2>
          <Badge variant="default">Chuẩn hóa tìm kiếm Campus</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="sell-university"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Trường đại học *
            </label>
            <select
              id="sell-university"
              value={universityId}
              onChange={(e) => handleUniversityChange(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
            >
              {universities.map((u) => {
                const hasMajors = getAllMajors(u.id).length > 0;
                return (
                  <option key={u.id} value={u.id} disabled={!hasMajors}>
                    {u.shortName} – {u.name}
                    {!hasMajors ? " (Sắp hỗ trợ)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label
              htmlFor="sell-major"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Khoa / Ngành *
            </label>
            <select
              id="sell-major"
              value={majorId}
              onChange={(e) => handleMajorChange(e.target.value)}
              disabled={filteredMajors.length === 0}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none disabled:bg-slate-100"
            >
              {filteredMajors.length === 0 ? (
                <option value="">Chưa có ngành hỗ trợ</option>
              ) : (
                filteredMajors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="sell-course"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Môn học / Học phần
            </label>
            <select
              id="sell-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={filteredCourses.length === 0}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none disabled:bg-slate-100"
            >
              <option value="">-- Không cố định môn học --</option>
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sell-cohort"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Khóa sinh viên gợi ý *
            </label>
            <select
              id="sell-cohort"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
            >
              {cohorts.map((c) => (
                <option key={c} value={c}>
                  Khóa {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Price, Condition & Preferred Smart Locker */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
          <Box className="h-5 w-5 text-brand-blue" />
          3. Mức giá, Tình trạng &amp; Trạm Smart Locker ưu tiên
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="sell-price"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Giá nhượng lại (VNĐ) *
            </label>
            <Input
              id="sell-price"
              type="number"
              min={5000}
              step={1000}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="VD: 35000"
              className="mt-1.5"
            />
          </div>

          <div>
            <label
              htmlFor="sell-original-price"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Giá bìa / mua mới (VNĐ)
            </label>
            <Input
              id="sell-original-price"
              type="number"
              min={5000}
              step={1000}
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="VD: 85000"
              className="mt-1.5"
            />
          </div>

          <div>
            <label
              htmlFor="sell-condition"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Tình trạng *
            </label>
            <select
              id="sell-condition"
              value={condition}
              onChange={(e) => {
                const nextCond = e.target.value as ProductCondition;
                setCondition(nextCond);
                const preset = CONDITION_ITEMS.find(
                  (item) => item.value === nextCond,
                );
                if (preset) setConditionPercent(preset.defaultPercent);
              }}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
            >
              {CONDITION_ITEMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sell-condition-percent"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Độ mới ước tính (%) *
            </label>
            <Input
              id="sell-condition-percent"
              type="number"
              min={50}
              max={100}
              required
              value={conditionPercent}
              onChange={(e) => setConditionPercent(Number(e.target.value))}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="sell-locker"
            className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
          >
            Trạm Smart Locker ưu tiên ký gửi *
          </label>
          <select
            id="sell-locker"
            value={preferredLockerId}
            onChange={(e) => setPreferredLockerId(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
          >
            {lockers.map((locker) => (
              <option key={locker.id} value={locker.id}>
                {locker.code} – {locker.name} ({locker.campusArea})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 4: Image Upload */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
              <ImagePlus className="h-5 w-5 text-brand-blue" />
              4. Hình ảnh thực tế sản phẩm (Tối đa 5 ảnh) *
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Hỗ trợ định dạng JPG, JPEG, PNG, WEBP (tối đa 5 MB/ảnh). Máy chủ
              kiểm tra chữ ký nhị phân (magic bytes) để đảm bảo an toàn.
            </p>
          </div>
          <Badge variant="outline">
            Đã chọn {existingImages.length + selectedFiles.length}/
            {MAX_PRODUCT_IMAGES} ảnh
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {existingImages.map((url, idx) => (
            <div
              key={`existing-${url}-${idx}`}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <Image
                src={url}
                alt={`Ảnh sản phẩm ${idx + 1}`}
                fill
                sizes="180px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeExistingImage(idx)}
                aria-label="Xóa ảnh này"
                className="absolute right-2 top-2 rounded-full bg-rose-600 p-1.5 text-white shadow-sm hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {previewUrls.map((url, idx) => (
            <div
              key={`preview-${url}-${idx}`}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-brand-blue/40 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Ảnh mới tải lên ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeSelectedFile(idx)}
                aria-label="Bỏ chọn ảnh này"
                className="absolute right-2 top-2 rounded-full bg-rose-600 p-1.5 text-white shadow-sm hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {existingImages.length + selectedFiles.length <
            MAX_PRODUCT_IMAGES && (
            <label
              htmlFor="sell-image-upload"
              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition-colors hover:border-brand-blue hover:bg-brand-blue-light/30"
            >
              <Upload className="h-6 w-6 text-brand-blue" />
              <span className="mt-2 text-xs font-bold text-brand-navy">
                Tải ảnh lên
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500">
                JPG, PNG, WEBP ≤ 5MB
              </span>
              <input
                id="sell-image-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesSelected}
                className="sr-only"
              />
            </label>
          )}
        </div>
      </div>

      {/* Submit Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
        <p className="flex items-center gap-1.5 text-xs text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-brand-green" />
          Tin đăng sẽ hiển thị trực tiếp trên Marketplace sau khi lưu thành công.
        </p>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline">
            <Link href="/my-products">Hủy bỏ</Link>
          </Button>
          <Button type="submit" size="lg" disabled={loading}>
            <Save className="h-4 w-4" />
            <span>
              {loading
                ? "Đang tải ảnh & lưu sản phẩm..."
                : mode === "create"
                  ? "Đăng bán sản phẩm"
                  : "Lưu cập nhật"}
            </span>
          </Button>
        </div>
      </div>
    </form>
  );
}
