"use client";

import React from "react";
import { TYPE_NAV } from "../tokens";

type Props = {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export const Chip = React.forwardRef<HTMLButtonElement, Props>(function Chip(
  { children, active = false, onClick, className, style },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`cursor-pointer ${className ?? ""}`}
      style={{
        background: active ? "var(--c-surface)" : "transparent",
        border: "none",
        padding: "6px 12px",
        borderRadius: 999,
        color: "var(--c-ink)",
        whiteSpace: "nowrap",
        ...TYPE_NAV,
        ...style,
      }}
    >
      {children}
    </button>
  );
});
