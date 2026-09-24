'use client';

import { useCallback, useEffect, useState } from 'react';
import apiService from '@/services/api';
import { TrackingDetail, TrackingItem, TrackingListResponse, VehicleStatus } from '@/types';
import { getApiErrorMessage } from '@/utils/tracking';

interface UseTrackingListOptions {
  search?: string;
  status?: VehicleStatus | '';
  onlineOnly?: boolean;
  /** Interval polling (ms). Default 5000. */
  intervalMs?: number;
}

/**
 * Polling posisi terkini semua kendaraan (GET /api/tracking).
 * - Polling berhenti saat tab tidak terlihat, dan langsung refresh saat tab aktif kembali.
 * - Data lama tetap ditampilkan bila satu kali polling gagal (error ditampilkan terpisah).
 */
export function useTrackingList({
  search = '',
  status = '',
  onlineOnly = false,
  intervalMs = 5000,
}: UseTrackingListOptions = {}) {
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [meta, setMeta] = useState<TrackingListResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true); // hanya true sampai respons pertama
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0); // dinaikkan untuk refresh manual

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await apiService.getTracking({ search, status, online: onlineOnly });
        if (cancelled) return;
        setItems(res.data);
        setMeta(res.meta);
        setError(null);
        setLastFetchedAt(new Date());
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };

    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [search, status, onlineOnly, intervalMs, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, meta, loading, error, lastFetchedAt, refresh };
}

interface UseVehicleTrackingOptions {
  /** Jumlah titik riwayat (maks 1000 di backend). Default 200. */
  limit?: number;
  intervalMs?: number;
}

/**
 * Polling detail 1 kendaraan + riwayat titik (GET /api/tracking/{vehicleId}).
 * Bila vehicleId null, tidak ada request yang dikirim.
 */
export function useVehicleTracking(
  vehicleId: number | null,
  { limit = 200, intervalMs = 5000 }: UseVehicleTrackingOptions = {}
) {
  const [detail, setDetail] = useState<TrackingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);

    if (vehicleId === null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    setLoading(true);

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await apiService.getVehicleTracking(vehicleId, { limit });
        if (cancelled) return;
        setDetail(res.data);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [vehicleId, limit, intervalMs]);

  return { detail, loading, error };
}