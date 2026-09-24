'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FieldErrors, Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, CheckCircle2, Crosshair, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import apiService from '@/services/api';
import { ApiError, Delivery, DeliveryProof } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignaturePad, SignaturePadHandle } from '@/components/delivery/signature-pad';
import { compressImage, formatFileSize } from '@/utils/image';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// ------------------------------------------------------------------
// Validasi form (React Hook Form + Zod).
// Resolver ditulis manual supaya tidak perlu menambah dependency @hookform/resolvers.
// Foto & tanda tangan divalidasi terpisah (bukan input teks biasa).
// ------------------------------------------------------------------
const schema = z.object({
  recipient_name: z
    .string()
    .trim()
    .min(2, 'Nama penerima minimal 2 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter'),
});

type FormValues = z.infer<typeof schema>;

const resolver: Resolver<FormValues> = async (values) => {
  const result = schema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };

  const errors: FieldErrors<FormValues> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof FormValues | undefined;
    if (key && !errors[key]) errors[key] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

type GeoState =
  | { status: 'loading' }
  | { status: 'ok'; latitude: number; longitude: number; accuracy: number }
  | { status: 'unavailable'; reason: string };

interface ProofFormModalProps {
  delivery: Delivery;
  onClose: () => void;
  /** Dipanggil setelah backend menyimpan bukti (delivery sudah 'delivered'). */
  onSubmitted: (proof: DeliveryProof) => void;
  /** Dipanggil bila backend menolak karena status/bukti sudah berubah (409/422) agar halaman memuat ulang data. */
  onConflict?: () => void;
}

export function ProofFormModal({ delivery, onClose, onSubmitted, onConflict }: ProofFormModalProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: { recipient_name: '', notes: '' },
  });

  const padRef = useRef<SignaturePadHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const [signatureError, setSignatureError] = useState<string | null>(null);

  const [geo, setGeo] = useState<GeoState>({ status: 'loading' });

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // --- Lokasi (opsional, tidak memblokir submit) ---
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo({ status: 'unavailable', reason: 'Browser tidak mendukung geolokasi' });
      return;
    }

    setGeo({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: 'ok',
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) =>
        setGeo({
          status: 'unavailable',
          reason:
            err.code === err.PERMISSION_DENIED
              ? 'Izin lokasi ditolak. Bukti tetap bisa dikirim tanpa lokasi.'
              : 'Lokasi tidak tersedia. Bukti tetap bisa dikirim tanpa lokasi.',
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // --- Preview foto (object URL dibersihkan saat berganti / unmount) ---
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // --- Tutup dengan Escape (kecuali sedang mengirim) ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // supaya memilih file yang sama tetap memicu onChange
    if (!file) return;

    setPhotoError(null);

    if (!file.type.startsWith('image/')) {
      setPhotoError('File harus berupa gambar (JPG, PNG, atau WebP)');
      return;
    }

    setCompressing(true);
    const processed = await compressImage(file);
    setCompressing(false);

    if (processed.size > MAX_PHOTO_BYTES) {
      setPhotoError(`Ukuran foto ${formatFileSize(processed.size)} melebihi batas 5 MB`);
      return;
    }

    setPhotoFile(processed);
  };

  const handleSubmitError = (error: unknown) => {
    if (axios.isAxiosError<ApiError>(error)) {
      if (!error.response) {
        setServerError('Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.');
        return;
      }

      const { status, data } = error.response;
      const fieldErrors = data?.errors ?? {};
      let hasFieldError = false;

      if (fieldErrors.recipient_name?.[0]) {
        setError('recipient_name', { type: 'server', message: fieldErrors.recipient_name[0] });
        hasFieldError = true;
      }
      if (fieldErrors.notes?.[0]) {
        setError('notes', { type: 'server', message: fieldErrors.notes[0] });
        hasFieldError = true;
      }
      if (fieldErrors.photo?.[0]) {
        setPhotoError(fieldErrors.photo[0]);
        hasFieldError = true;
      }
      if (fieldErrors.signature?.[0]) {
        setSignatureError(fieldErrors.signature[0]);
        hasFieldError = true;
      }

      const otherError = fieldErrors.latitude?.[0] ?? fieldErrors.longitude?.[0] ?? fieldErrors.delivered_at?.[0];

      setServerError(
        otherError ??
          (status === 400 && hasFieldError
            ? 'Periksa kembali isian yang ditandai.'
            : status === 403
              ? data?.message ?? 'Anda tidak memiliki akses untuk mengirim bukti pengiriman ini'
              : data?.message ?? 'Gagal mengirim bukti pengiriman')
      );

      if (status === 409 || status === 422) onConflict?.();
      return;
    }

    setServerError('Terjadi kesalahan tak terduga');
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const signature = padRef.current?.toDataURL() ?? null;

    if (!photoFile) setPhotoError('Foto bukti pengiriman wajib diambil');
    if (!signature) setSignatureError('Tanda tangan penerima wajib diisi');
    if (!photoFile || !signature) return;

    setSubmitting(true);
    setProgress(0);

    try {
      const res = await apiService.submitDeliveryProof(
        delivery.id,
        {
          recipient_name: values.recipient_name,
          photo: photoFile,
          signature,
          latitude: geo.status === 'ok' ? geo.latitude : undefined,
          longitude: geo.status === 'ok' ? geo.longitude : undefined,
          notes: values.notes.trim() || undefined,
        },
        setProgress
      );
      onSubmitted(res.data);
    } catch (error) {
      handleSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="proof-title">
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4">
        <div className="bg-white w-full sm:max-w-lg sm:rounded-lg rounded-t-lg shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-start p-5 border-b">
            <div>
              <h2 id="proof-title" className="text-lg font-semibold">
                Selesaikan Pengiriman
              </h2>
              <p className="text-sm text-gray-500">
                {delivery.order_number} &middot; {delivery.customer_name}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting} aria-label="Tutup">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="p-5 space-y-5">
              {serverError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {serverError}
                </div>
              )}

              {/* Nama penerima */}
              <div>
                <label htmlFor="recipient_name" className="text-sm font-medium mb-1 block">
                  Nama Penerima <span className="text-red-500">*</span>
                </label>
                <Input
                  id="recipient_name"
                  placeholder="Nama orang yang menerima barang"
                  disabled={submitting}
                  {...register('recipient_name')}
                />
                {errors.recipient_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.recipient_name.message}</p>
                )}
              </div>

              {/* Foto */}
              <div>
                <span className="text-sm font-medium mb-1 block">
                  Foto Bukti <span className="text-red-500">*</span>
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />

                {photoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Pratinjau foto bukti pengiriman"
                    className="w-full max-h-64 object-contain rounded-md border bg-gray-50 mb-2"
                  />
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || compressing}
                  >
                    {compressing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    {photoFile ? 'Ganti Foto' : 'Ambil / Pilih Foto'}
                  </Button>
                  {photoFile && (
                    <span className="text-xs text-gray-500">
                      {photoFile.name} &middot; {formatFileSize(photoFile.size)}
                    </span>
                  )}
                </div>
                {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
              </div>

              {/* Tanda tangan */}
              <div>
                <span className="text-sm font-medium mb-1 block">
                  Tanda Tangan Penerima <span className="text-red-500">*</span>
                </span>
                <SignaturePad
                  ref={padRef}
                  disabled={submitting}
                  onChange={(has) => {
                    if (has) setSignatureError(null);
                  }}
                />
                {signatureError && <p className="text-xs text-red-600 mt-1">{signatureError}</p>}
              </div>

              {/* Lokasi */}
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 text-gray-600">
                    {geo.status === 'ok' ? (
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
                    ) : geo.status === 'loading' ? (
                      <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                    )}
                    <div>
                      {geo.status === 'loading' && 'Mengambil lokasi saat ini...'}
                      {geo.status === 'ok' && (
                        <>
                          Lokasi terdeteksi (akurasi &plusmn;{geo.accuracy} m)
                          <div className="text-xs text-gray-400">
                            {geo.latitude.toFixed(6)}, {geo.longitude.toFixed(6)}
                          </div>
                        </>
                      )}
                      {geo.status === 'unavailable' && geo.reason}
                    </div>
                  </div>
                  {geo.status !== 'loading' && (
                    <Button type="button" variant="ghost" size="sm" onClick={requestLocation} disabled={submitting}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label htmlFor="notes" className="text-sm font-medium mb-1 block">
                  Catatan <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  disabled={submitting}
                  placeholder="Mis. barang dititipkan ke satpam"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  {...register('notes')}
                />
                {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>}
              </div>

              {/* Progress upload */}
              {submitting && (
                <div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress < 100 ? `Mengunggah... ${progress}%` : 'Memproses di server...'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting || compressing}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Kirim &amp; Tandai Terkirim
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}