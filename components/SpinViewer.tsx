"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw, ArrowUpRight } from "lucide-react";

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
  const pillRef = useRef<HTMLDivElement>(null);
  const pillTargetRef = useRef<{ x: number; y: number } | null>(null);
  const pillCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pillRafRef = useRef(0);
  const pillFirstMoveRef = useRef(true);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pillReady, setPillReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (pillRafRef.current) cancelAnimationFrame(pillRafRef.current);
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
          const duration = 1250;
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
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && pillRef.current) {
      const x = e.clientX;
      const y = e.clientY;
      pillTargetRef.current = { x, y };
      if (pillFirstMoveRef.current) {
        pillCurrentRef.current = { x, y };
        pillFirstMoveRef.current = false;
        pillRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (!pillReady) setPillReady(true);
      }
      if (!pillRafRef.current) {
        const step = () => {
          const t = pillTargetRef.current;
          const c = pillCurrentRef.current;
          if (!t || !pillRef.current) {
            pillRafRef.current = 0;
            return;
          }
          c.x += (t.x - c.x) * 0.15;
          c.y += (t.y - c.y) * 0.15;
          pillRef.current.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
          if (Math.abs(t.x - c.x) < 0.3 && Math.abs(t.y - c.y) < 0.3) {
            pillRafRef.current = 0;
            return;
          }
          pillRafRef.current = requestAnimationFrame(step);
        };
        pillRafRef.current = requestAnimationFrame(step);
      }
    }
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
    setDragging(false);
  };

  const pillVisible = showHint && loaded && hovered && pillReady && !dragging;

  return (
    <div className={`relative ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        width={800}
        height={1000}
        className={`select-none transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } cursor-grab active:cursor-grabbing`}
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setPillReady(false);
          pillFirstMoveRef.current = true;
          if (pillRafRef.current) {
            cancelAnimationFrame(pillRafRef.current);
            pillRafRef.current = 0;
          }
        }}
      />

      {mounted &&
        createPortal(
          <div
            ref={pillRef}
            className="pointer-events-none fixed z-[60]"
            style={{ left: 0, top: 0, willChange: "transform" }}
          >
            <div
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-900/70 backdrop-blur-sm text-white text-[13px] font-medium tracking-tight whitespace-nowrap origin-top -translate-x-1/2 translate-y-[4px] transition-[opacity,transform] duration-200 ease-out ${
                pillVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
            >
              <span>Drag to rotate</span>
              <RotateCw width={12} height={12} strokeWidth={2} className="opacity-70" />
            </div>
          </div>,
          document.body
        )}

      {credit && (
        <div
          className={`absolute bottom-2 left-3 text-[12px] tracking-tight text-neutral-400 transition-[opacity,transform] duration-200 ease-out opacity-0 translate-y-0.5 group-hover/card:opacity-100 group-hover/card:translate-y-0 ${
            loaded ? "" : "!opacity-0"
          }`}
        >
          {credit.prefix && <span>{credit.prefix} </span>}
          {credit.href ? (
            <a
              href={credit.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group/extlink inline-flex items-center gap-0.5"
            >
              {credit.name}
              <ArrowUpRight
                width={10}
                height={10}
                strokeWidth={2}
                className="opacity-0 -mt-px transition-opacity duration-150 group-hover/extlink:opacity-70"
              />
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
