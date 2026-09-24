import axios from 'axios';
import { VehicleStatus } from '@/types';

/**
 * Backend mengirim `timestamp` sebagai "YYYY-MM-DD HH:MM:SS" dalam zona waktu server
 * (appTimezone di backend, saat ini UTC). Jangan pakai `new Date(ts)` langsung karena
 * browser akan menganggapnya waktu lokal.
 */
export function parseServerTime(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  const date = new Date(ts.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(ts: string | null | undefined): string {
  const date = parseServerTime(ts);
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date) + ' WIB';
}

export function formatSecondsAgo(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return 'Belum ada data';
  if (seconds < 10) return 'Baru saja';
  if (seconds < 60) return `${seconds} detik lalu`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return `${Math.floor(hours / 24)} hari lalu`;
}

export function formatCoordinate(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : value.toFixed(6);
}

export function formatSpeed(speed: number | null | undefined): string {
  return speed === null || speed === undefined ? '-' : `${Math.round(speed)} km/jam`;
}

/** Warna marker berdasarkan status kendaraan. */
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: '#16a34a',
  assigned: '#2563eb',
  on_delivery: '#d97706',
  maintenance: '#dc2626',
  inactive: '#6b7280',
};

export const OFFLINE_COLOR = '#9ca3af';

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Tersedia',
  assigned: 'Ditugaskan',
  on_delivery: 'Dalam Pengiriman',
  maintenance: 'Perawatan',
  inactive: 'Tidak Aktif',
};

/** Ambil pesan error yang ramah dari error Axios / error biasa. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Tidak dapat terhubung ke server';
    if (error.response.status === 403) return 'Anda tidak memiliki akses ke data tracking';
    const message = (error.response.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  if (error instanceof Error) return error.message;
  return 'Terjadi kesalahan tak terduga';
}