'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SignaturePadHandle {
  /** Data URL PNG, atau null bila belum ada tanda tangan yang layak. */
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  onChange?: (hasSignature: boolean) => void;
  disabled?: boolean;
  className?: string;
}

// Resolusi internal tetap; tampilan di layar mengikuti lebar container (CSS), koordinat di-scale.
const WIDTH = 600;
const HEIGHT = 240;
// Total panjang goresan minimal agar dianggap tanda tangan (mengabaikan ketukan tak sengaja)
const MIN_INK_LENGTH = 30;

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onChange, disabled = false, className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const inkLength = useRef(0);
  const [hasInk, setHasInk] = useState(false);

  const paintBackground = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }, []);

  useEffect(() => {
    paintBackground();
  }, [paintBackground]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (WIDTH / rect.width),
      y: (e.clientY - rect.top) * (HEIGHT / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    const from = lastPoint.current;
    if (!ctx || !from) return;

    const to = getPoint(e);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    inkLength.current += Math.hypot(to.x - from.x, to.y - from.y);
    lastPoint.current = to;

    if (!hasInk && inkLength.current >= MIN_INK_LENGTH) {
      setHasInk(true);
      onChange?.(true);
    }
  };

  const endStroke = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const clear = useCallback(() => {
    paintBackground();
    inkLength.current = 0;
    setHasInk(false);
    onChange?.(false);
  }, [onChange, paintBackground]);

  useImperativeHandle(
    ref,
    () => ({
      toDataURL: () =>
        inkLength.current >= MIN_INK_LENGTH ? canvasRef.current?.toDataURL('image/png') ?? null : null,
      clear,
      isEmpty: () => inkLength.current < MIN_INK_LENGTH,
    }),
    [clear]
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className={cn(
            'w-full h-auto rounded-md border border-input bg-white touch-none',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'
          )}
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          aria-label="Area tanda tangan penerima"
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300 select-none">
            Tanda tangan penerima di sini
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={disabled || !hasInk}>
          <Eraser className="w-4 h-4 mr-2" />
          Hapus
        </Button>
      </div>
    </div>
  );
});