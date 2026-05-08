"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface SpinViewerProps {
  frameCount: number;
  path: string;
  pxPerFrame?: number;
  showHint?: boolean;
  className?: string;
  style?: React.CSSProperties;
  credit?: { prefix?: string; name: string; href?: string };
}

export interface SpinViewerHandle {
  unwind: () => Promise<void>;
  playRotation: () => Promise<void>;
  cancelPlay: () => void;
}

const SpinViewer = forwardRef<SpinViewerHandle, SpinViewerProps>(function SpinViewer(
  { frameCount, path, pxPerFrame = 14, showHint = true, className = "", style, credit },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const dragRef = useRef<{ startX: number; startFrame: number } | null>(null);
  const unwindingRef = useRef(false);
  const playCancelRef = useRef<(() => void) | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    let alive = true;
    let done = 0;
    const imgs = Array.from({ length: frameCount }, (_, i) => {
      const img = new Image();
      img.src = `${path}/frame_${String(i).padStart(4, "0")}.webp`;
      img.onload = () => {
        done++;
        if (done === frameCount && alive) {
          setLoaded(true);
          requestAnimationFrame(draw);
        }
      };
      return img;
    });
    imagesRef.current = imgs;
    return () => {
      alive = false;
    };
  }, [frameCount, path]);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[frameRef.current];
    if (!canvas || !img?.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  useImperativeHandle(
    ref,
    () => ({
      unwind: () =>
        new Promise<void>((resolve) => {
          const start = frameRef.current;
          if (start === 0) {
            resolve();
            return;
          }
          // Shortest path back to frame 0 around the loop
          const forward = frameCount - start;
          const backward = start;
          const distance = Math.min(forward, backward);
          const direction = forward < backward ? 1 : -1;
          const duration = Math.min(450, 220 + distance * 14);
          const t0 = performance.now();
          unwindingRef.current = true;
          dragRef.current = null;

          const tick = (now: number) => {
            const t = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const offset = eased * distance;
            let next = Math.round(start + direction * offset);
            next = ((next % frameCount) + frameCount) % frameCount;
            if (t >= 1) next = 0;
            if (next !== frameRef.current) {
              frameRef.current = next;
              draw();
            }
            if (t < 1 && canvasRef.current) {
              requestAnimationFrame(tick);
            } else {
              unwindingRef.current = false;
              resolve();
            }
          };
          requestAnimationFrame(tick);
        }),
      playRotation: () =>
        new Promise<void>((resolve) => {
          const start = frameRef.current;
          const duration = 1400;
          const t0 = performance.now();
          let cancelled = false;
          unwindingRef.current = true;
          dragRef.current = null;
          playCancelRef.current = () => {
            cancelled = true;
          };

          const finish = () => {
            unwindingRef.current = false;
            playCancelRef.current = null;
            resolve();
          };

          const tick = (now: number) => {
            if (cancelled || !canvasRef.current) {
              finish();
              return;
            }
            const t = Math.min(1, (now - t0) / duration);
            // Linear — constant angular velocity feels honest for a spin
            let next = Math.round(start + t * frameCount);
            next = ((next % frameCount) + frameCount) % frameCount;
            if (t >= 1) next = start;
            if (next !== frameRef.current) {
              frameRef.current = next;
              draw();
            }
            if (t < 1) {
              requestAnimationFrame(tick);
            } else {
              finish();
            }
          };
          requestAnimationFrame(tick);
        }),
      cancelPlay: () => {
        playCancelRef.current?.();
      },
    }),
    [frameCount]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded || unwindingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startFrame: frameRef.current };
    if (!hasInteracted) setHasInteracted(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const delta = Math.round(dx / pxPerFrame);
    let next = (d.startFrame + delta) % frameCount;
    if (next < 0) next += frameCount;
    if (next !== frameRef.current) {
      frameRef.current = next;
      requestAnimationFrame(draw);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className={`relative ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        width={800}
        height={1000}
        className={`select-none cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          touchAction: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {showHint && (
        <div
          className={`pointer-events-none absolute left-1/2 bottom-2 -translate-x-1/2 text-[12px] tracking-tight text-neutral-400 transition-opacity duration-500 ${
            loaded && !hasInteracted ? "opacity-100" : "opacity-0"
          }`}
        >
          Drag to rotate
        </div>
      )}

      {credit && (
        <div
          className={`absolute bottom-2 left-3 text-[11px] tracking-tight text-neutral-400 transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {credit.prefix && <span>{credit.prefix} </span>}
          {credit.href ? (
            <a
              href={credit.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              {credit.name}
            </a>
          ) : (
            <span>{credit.name}</span>
          )}
        </div>
      )}
    </div>
  );
});

SpinViewer.displayName = "SpinViewer";

export default SpinViewer;
