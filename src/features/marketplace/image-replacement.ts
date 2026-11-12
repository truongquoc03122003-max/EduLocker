export interface ExistingImageRecord {
  id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string;
  display_order: number;
}

export interface NewImageUploadItem {
  storagePath: string;
  altText: string;
  displayOrder: number;
  upload: () => Promise<{ publicUrl: string; error?: string }>;
}

export interface ImageReplacementAdapter {
  insertNewImageRows: (
    rows: Array<{
      product_id: string;
      image_url: string;
      storage_path: string;
      alt_text: string;
      display_order: number;
    }>,
  ) => Promise<{ insertedIds: string[]; error?: string }>;
  deleteImageRowsByIds: (ids: string[]) => Promise<{ error?: string }>;
  removeStorageFiles: (paths: string[]) => Promise<{ error?: string }>;
}

/**
 * Thực thi quy trình thay thế hình ảnh sản phẩm an toàn (7 bước chống mất dữ liệu):
 * 1. Giữ nguyên ảnh cũ (`oldImages`).
 * 2. Tải TOÀN BỘ ảnh mới lên các đường dẫn mới (`NewImageUploadItem`).
 * 3. Nếu bất kỳ lượt upload nào thất bại:
 *    - Xóa ngay các file mới vừa tải lên (`uploadedNewPaths`),
 *    - Giữ nguyên ảnh cũ trên Storage và các dòng `product_images` cũ trong DB,
 *    - Trả về lỗi.
 * 4. Sau khi TẤT CẢ lượt upload thành công:
 *    - Insert toàn bộ các dòng `product_images` mới trong một thao tác batch DB duy nhất.
 * 5. Nếu insert DB thất bại:
 *    - Dọn dẹp các file mới đã upload (và các dòng mới nếu có),
 *    - Giữ nguyên ảnh cũ.
 * 6. Chỉ khi các dòng ảnh mới đã hoàn chỉnh trong DB:
 *    - Xóa các dòng `product_images` cũ cần thay thế,
 *    - Xóa các file ảnh cũ tương ứng trên Storage.
 */
export async function executeSafeImageReplacement(params: {
  productId: string;
  oldImagesToReplace: ExistingImageRecord[];
  newUploads: NewImageUploadItem[];
  adapter: ImageReplacementAdapter;
}): Promise<{ success: boolean; error?: string }> {
  const { productId, oldImagesToReplace, newUploads, adapter } = params;

  const uploadedNewPaths: string[] = [];
  const rowsToInsert: Array<{
    product_id: string;
    image_url: string;
    storage_path: string;
    alt_text: string;
    display_order: number;
  }> = [];

  // Bước 3 & 4: Upload toàn bộ ảnh mới vào các đường dẫn mới
  for (const item of newUploads) {
    try {
      const res = await item.upload();
      if (res.error || !res.publicUrl) {
        if (uploadedNewPaths.length > 0) {
          await adapter.removeStorageFiles(uploadedNewPaths);
        }
        return {
          success: false,
          error: res.error ?? "Tải ảnh mới lên Storage thất bại.",
        };
      }

      uploadedNewPaths.push(item.storagePath);
      rowsToInsert.push({
        product_id: productId,
        image_url: res.publicUrl,
        storage_path: item.storagePath,
        alt_text: item.altText,
        display_order: item.displayOrder,
      });
    } catch (err) {
      if (uploadedNewPaths.length > 0) {
        await adapter.removeStorageFiles(uploadedNewPaths);
      }
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi tải ảnh mới lên Storage.",
      };
    }
  }

  // Bước 5 & 6: Insert toàn bộ các dòng `product_images` mới trong 1 batch DB operation
  if (rowsToInsert.length > 0) {
    const insertResult = await adapter.insertNewImageRows(rowsToInsert);
    if (insertResult.error) {
      if (insertResult.insertedIds.length > 0) {
        await adapter.deleteImageRowsByIds(insertResult.insertedIds);
      }
      if (uploadedNewPaths.length > 0) {
        await adapter.removeStorageFiles(uploadedNewPaths);
      }
      return {
        success: false,
        error: insertResult.error,
      };
    }
  }

  // Bước 7: Chỉ sau khi ảnh mới đã hoàn chỉnh trong DB, mới xóa dòng DB cũ và xóa file Storage cũ
  const oldIdsToDelete = oldImagesToReplace.map((img) => img.id);
  if (oldIdsToDelete.length > 0) {
    const delResult = await adapter.deleteImageRowsByIds(oldIdsToDelete);
    if (delResult.error) {
      // Nếu xóa dòng cũ lỗi, vẫn giữ dữ liệu an toàn và báo lỗi
      return {
        success: false,
        error: delResult.error,
      };
    }
  }

  const oldStoragePaths = oldImagesToReplace
    .map((img) => img.storage_path)
    .filter((p): p is string => Boolean(p));

  if (oldStoragePaths.length > 0) {
    try {
      await adapter.removeStorageFiles(oldStoragePaths);
    } catch {
      // Ghi nhận cleanup nhẹ nhàng, không làm hỏng giao dịch DB đã thành công
    }
  }

  return { success: true };
}

