import type { Id } from "@/convex/_generated/dataModel";

/** Shrinks a photo so its longest side is at most `maxSize` px, so the POS grid stays fast on cheap tablets. */
export async function resizeImage(file: File, maxSize = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  // Browsers that can't encode WebP fall back to PNG, which is much larger, so use JPEG instead.
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("Couldn't read that photo.");
  return blob;
}

/** POSTs a file to a Convex upload URL and returns its storage ID. */
export async function uploadFile(uploadUrl: string, blob: Blob) {
  const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
  if (!response.ok) throw new Error("Upload failed.");
  const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
