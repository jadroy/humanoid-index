"use client";

import { useEffect, useRef, useState } from "react";

interface SpinViewerProps {
  frameCount: number;
  path: string;
  pxPerFrame?: number;
  showHint?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function SpinViewer({
  frameCount,
  path,
  pxPerFrame = 14,
  showHint = true,
  className = "",
  style,
}: SpinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const dragRef = useRef<{ startX: number; startFrame: number } | null>(null);
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

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded) return;
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
    </div>
  );
}
