"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SCRIM, EASE, DUR, panelStyle } from "@/lib/design/chrome";

/* ===========================================================================
   OVERLAY — the one shape for everything that opens over the page.

   Search, Ask and Feedback all do the same thing: you type, and something
   comes back. They had drifted into three different components — a bar pinned
   near the top with no scrim, a sheet glued to the card's bottom edge with no
   scrim, and a dead-centre dialog under a blur with a title bar and a Cancel
   button. Three positions, three weights, three ways to leave. The materials
   were already shared (`panelStyle`, INK, SCRIM); the frame was not, which is
   what made them read as three products stacked on one page.

   So the frame lives here and nowhere else. It owns:
     - where the panel sits (one place, high and centred — clear of the card)
     - the scrim, and the fact that clicking it closes
     - Esc
     - the entry motion

   A caller supplies content and nothing else. That is deliberate: a panel that
   can choose its own position or its own way of being dismissed is how the
   drift started. If a surface needs a Cancel button, it doesn't — the scrim
   and Esc are the way out, everywhere, and one exit is easier to learn than
   four.
   =========================================================================== */

/* High rather than centred. A centred panel covers the robot it is about;
   this clears the card's top edge at every viewport we render, so the thing
   you were looking at is still there behind the thing you opened. */
const TOP = "14vh";

/* One width. Search's results and Feedback's compose box both sit comfortably
   here, and a shared width is most of what makes two panels read as one. */
const WIDTH = 460;

export default function Overlay({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // `onClose` is typically an inline arrow from the caller — fresh every
  // render — so it's read through a ref and the listener binds once.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={() => onClose()}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: TOP,
        paddingLeft: 24,
        paddingRight: 24,
        // Warm scrim, no blur. Feedback used to add `blur(2px)` on top of this
        // and nothing else did, which is why it alone felt like a modal.
        background: SCRIM,
        animation: `share-modal-fade ${DUR.fast}ms ${EASE} both`,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="overflow-hidden"
        style={{
          width: "100%",
          maxWidth: WIDTH,
          ...panelStyle(),
          animation: `chat-rise ${DUR.base}ms ${EASE} both`,
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
