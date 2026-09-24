'use client';

import { useEffect, useState } from 'react';
import { Clock, ExternalLink, ImageOff, Loader2, MapPin, StickyNote, User, X, ZoomIn } from 'lucide-react';
import { DeliveryProof } from '@/types';
import { useProofImage } from '@/hooks/use-proof-image';
import { formatDateTime } from '@/utils/tracking';
import { cn } from '@/lib/utils';

interface ImageTileProps {
  title: string;
  url: string | null;
  loading: boolean;
  error: string | null;
  fit: 'cover' | 'contain';
  onOpen: (src: string, title: string) => void;
}

function ImageTile({ title, url, loading, error, fit, onOpen }: ImageTileProps) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="relative h-48 rounded-md border bg-gray-50 overflow-hidden flex items-center justify-center">
        {loading && <Loader2 className="w-6 h-6 animate-spin text-gray-400" />}

        {!loading && error && (
          <div className="flex flex-col items-center gap-1 text-xs text-gray-400">
            <ImageOff className="w-6 h-6" />
            {error}
          </div>
        )}

        {!loading && url && (
          <button
            type="button"
            onClick={() => onOpen(url, title)}
            className="group w-full h-full bg-white relative"
            aria-label={`Perbesar ${title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={title}
              className={cn('w-full h-full', fit === 'cover' ? 'object-cover' : 'object-contain')}
            />
            <span className="absolute right-2 bottom-2 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function ProofViewer({ proof }: { proof: DeliveryProof }) {
  const photo = useProofImage(proof.delivery_id, 'photo');
  const signature = useProofImage(proof.delivery_id, 'signature');
  const [zoom, setZoom] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoom]);

  const hasCoords = proof.latitude !== null && proof.longitude !== null;
  const mapUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${proof.latitude}&mlon=${proof.longitude}#map=17/${proof.latitude}/${proof.longitude}`
    : null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detail */}
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2 text-gray-600">
            <User className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-gray-400">Diterima oleh</div>
              <span className="font-medium text-gray-900">{proof.recipient_name}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-gray-600">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-gray-400">Waktu diterima</div>
              {formatDateTime(proof.delivered_at)}
            </div>
          </div>

          <div className="flex items-start gap-2 text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-gray-400">Lokasi penyerahan</div>
              {hasCoords ? (
                <div className="flex flex-col gap-1">
                  <span>
                    {proof.latitude!.toFixed(6)}, {proof.longitude!.toFixed(6)}
                  </span>
                  <a
                    href={mapUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-medium"
                  >
                    Lihat peta <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <span className="text-gray-400">Tidak dicatat</span>
              )}
            </div>
          </div>

          {proof.submitted_by?.name && (
            <div className="flex items-start gap-2 text-gray-600">
              <User className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Dikirim oleh</div>
                {proof.submitted_by.name}
              </div>
            </div>
          )}

          {proof.notes && (
            <div className="flex items-start gap-2 text-gray-600">
              <StickyNote className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Catatan</div>
                {proof.notes}
              </div>
            </div>
          )}
        </div>

        {/* Foto & tanda tangan */}
        <div className="grid grid-cols-2 gap-3">
          <ImageTile title="Foto" fit="cover" onOpen={(src, title) => setZoom({ src, title })} {...photo} />
          <ImageTile
            title="Tanda tangan"
            fit="contain"
            onOpen={(src, title) => setZoom({ src, title })}
            {...signature}
          />
        </div>
      </div>

      {/* Lightbox */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label={zoom.title}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            onClick={() => setZoom(null)}
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.src}
            alt={zoom.title}
            className="max-h-full max-w-full rounded-md bg-white object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}