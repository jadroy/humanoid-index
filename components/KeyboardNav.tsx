"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface KeyboardNavProps {
  prevId: string | null;
  nextId: string | null;
}

export default function KeyboardNav({ prevId, nextId }: KeyboardNavProps) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && prevId) {
        router.push(`/robot/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId) {
        router.push(`/robot/${nextId}`);
      } else if (e.key === "Escape") {
        router.push("/");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevId, nextId, router]);

  return null;
}
