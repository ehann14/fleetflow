/**
 * Perkecil foto dari kamera HP sebelum diunggah.
 * Foto asli HP sering 4-10 MB, sedangkan backend membatasi 5 MB per file
 * (dan php.ini bawaan XAMPP hanya 2 MB). Hasil: JPEG maks 1600px.
 *
 * Bila gagal diproses (mis. format tidak didukung browser), file asli dikembalikan
 * dan validasi akhir tetap dilakukan oleh backend.
 */
export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  /** File JPEG di bawah ukuran ini dan dimensinya sudah kecil dibiarkan apa adanya. */
  skipBelowBytes?: number;
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxDimension = 1600, quality = 0.85, skipBelowBytes = 800 * 1024 } = options;

  if (typeof window === 'undefined' || !file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.type === 'image/jpeg' && file.size <= skipBelowBytes) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // Latar putih supaya PNG transparan tidak menjadi hitam saat jadi JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

    // Jangan ganti bila hasilnya justru lebih besar dan tidak ada pengecilan dimensi
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}