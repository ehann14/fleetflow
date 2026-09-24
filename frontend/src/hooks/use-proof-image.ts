'use client';

import { useEffect, useState } from 'react';
import apiService from '@/services/api';

/**
 * Ambil foto / tanda tangan bukti pengiriman sebagai blob lalu ubah jadi object URL
 * yang aman dipakai di <img src>. Endpoint file dilindungi JWT, jadi <img src="/api/..."> langsung akan 401.
 * Object URL otomatis di-revoke saat komponen unmount / parameter berubah.
 */
export function useProofImage(deliveryId: number, kind: 'photo' | 'signature', enabled = true) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !deliveryId) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);

    apiService
      .getProofImage(deliveryId, kind)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat gambar');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [deliveryId, kind, enabled]);

  return { url, loading, error };
}