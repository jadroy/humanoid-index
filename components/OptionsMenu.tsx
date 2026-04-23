"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MenuStyle =
  | "dropdown"
  | "icon-rows"
  | "pill-stack"
  | "fan-vertical"
  | "arc-quarter"
  | "row-horizontal"
  | "bottom-sheet"
  | "inline-morph";

export const MENU_STYLES: MenuStyle[] = [
  "dropdown",
  "icon-rows",
  "pill-stack",
  "fan-vertical",
  "arc-quarter",
  "row-horizontal",
  "bottom-sheet",
  "inline-morph",
];

export const MENU_LABELS: Record<MenuStyle, string> = {
  dropdown: "Frosted",
  "icon-rows": "Icon rows",
  "pill-stack": "Pill stack",
  "fan-vertical": "Fan",
  "arc-quarter": "Arc",
  "row-horizontal": "Row",
  "bottom-sheet": "Sheet",
  "inline-morph": "Morph",
};

// ── Icons ────────────────────────────────────────────────────

const stroke: CSSProperties = { fill: "none", stroke: "currentColor" };

function IconShare({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
function IconLink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconHelp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconDots({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────

type Props = {
  style: MenuStyle;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  onShareSite: () => void;
  onShareView: () => void;
  visible: boolean;
};

export default function OptionsMenu({ style, chatOpen, setChatOpen, onShareSite, onShareView, visible }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (chatOpen) setOpen(false);
  }, [chatOpen]);

  // Close menu on style change so we don't flash weird mid-animation
  useEffect(() => {
    setOpen(false);
  }, [style]);

  const items = [
    { key: "site", label: "Share site", Icon: IconShare, onClick: () => { onShareSite(); setOpen(false); } },
    { key: "view", label: "Share current view", Icon: IconLink, onClick: () => { onShareView(); setOpen(false); } },
    { key: "help", label: "Help", Icon: IconHelp, onClick: () => { setOpen(false); setChatOpen(true); } },
  ];

  const wrapperClass = visible ? "intro-nav" : "opacity-0";

  const triggerBase: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 200ms",
    background: chatOpen ? "var(--c-ink)" : "#F7F7F7",
    color: chatOpen ? "white" : "#999",
    border: "none",
  };

  const onTriggerClick = () => {
    if (chatOpen) { setChatOpen(false); return; }
    setOpen((v) => !v);
  };

  const triggerContent = chatOpen ? <span style={{ fontSize: 14, fontWeight: 500 }}>×</span> : <IconDots />;

  // ── Variant 1 & 2: dropdown / icon-rows ────────────────────

  if (style === "dropdown" || style === "icon-rows") {
    const showIcons = style === "icon-rows";
    return (
      <div className={wrapperClass}>
        <div ref={rootRef} className="fixed bottom-6 z-50" style={{ right: "var(--arc-logo-x, 24px)" }}>
          <button style={triggerBase} onClick={onTriggerClick} aria-label={chatOpen ? "Close help" : "Options"}>
            {triggerContent}
          </button>
          {open && !chatOpen && (
            <div className="absolute bottom-full right-0 mb-2">
              <div
                className="flex flex-col py-1"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 12,
                  minWidth: 200,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                  animation: "chat-rise 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
                }}
              >
                {items.map((it, i) => (
                  <button
                    key={it.key}
                    onClick={it.onClick}
                    className="cursor-pointer transition-colors duration-100 hover:bg-black/[0.04]"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 14px",
                      fontSize: 13,
                      color: "#1d1d1f",
                      textAlign: "left",
                      borderTop: i > 0 && !showIcons ? "1px solid rgba(0,0,0,0.04)" : "none",
                    }}
                  >
                    {showIcons && <span style={{ color: "#888", display: "flex" }}><it.Icon size={13} /></span>}
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Variant 3: pill-stack ──────────────────────────────────

  if (style === "pill-stack") {
    return (
      <div className={wrapperClass}>
        <div ref={rootRef} className="fixed bottom-6 z-50" style={{ right: "var(--arc-logo-x, 24px)" }}>
          <button style={triggerBase} onClick={onTriggerClick} aria-label={chatOpen ? "Close help" : "Options"}>
            {triggerContent}
          </button>
          {open && !chatOpen && (
            <div
              className="absolute bottom-full right-0 flex flex-col items-end"
              style={{ marginBottom: 8, gap: 6 }}
            >
              {items.slice().reverse().map((it, iRev) => {
                const i = items.length - 1 - iRev;
                return (
                  <button
                    key={it.key}
                    onClick={it.onClick}
                    className="cursor-pointer"
                    style={{
                      background: "white",
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontSize: 13,
                      color: "#1d1d1f",
                      whiteSpace: "nowrap",
                      animation: `chat-rise 0.22s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both`,
                    }}
                  >
                    {it.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Variant 4: fan-vertical ────────────────────────────────

  if (style === "fan-vertical") {
    return (
      <div className={wrapperClass}>
        <div ref={rootRef} className="fixed bottom-6 z-50" style={{ right: "var(--arc-logo-x, 24px)" }}>
          <button style={triggerBase} onClick={onTriggerClick} aria-label={chatOpen ? "Close help" : "Options"}>
            {triggerContent}
          </button>
          {open && !chatOpen && (
            <div className="absolute bottom-full right-0 flex flex-col items-center" style={{ marginBottom: 8, gap: 8 }}>
              {items.slice().reverse().map((it, iRev) => {
                const i = items.length - 1 - iRev;
                return (
                  <div key={it.key} className="group relative" style={{ animation: `chat-rise 0.22s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both` }}>
                    <button
                      onClick={it.onClick}
                      title={it.label}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: "white",
                        border: "1px solid rgba(0,0,0,0.06)",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                        color: "#555",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <it.Icon size={13} />
                    </button>
                    <span
                      className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
                      style={{
                        position: "absolute",
                        right: "calc(100% + 8px)",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(17,17,17,0.9)",
                        color: "white",
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Variant 5: arc-quarter ─────────────────────────────────

  if (style === "arc-quarter") {
    const radius = 72;
    // Angles go from upper (−90°) sweeping counter-clockwise to left (−180°)
    const angles = [-95, -135, -175]; // degrees
    return (
      <div className={wrapperClass}>
        <div ref={rootRef} className="fixed bottom-6 z-50" style={{ right: "var(--arc-logo-x, 24px)" }}>
          <button style={{ ...triggerBase, position: "relative", zIndex: 2 }} onClick={onTriggerClick} aria-label={chatOpen ? "Close help" : "Options"}>
            {triggerContent}
          </button>
          {open && !chatOpen && items.map((it, i) => {
            const rad = (angles[i] * Math.PI) / 180;
            const dx = Math.cos(rad) * radius;
            const dy = Math.sin(rad) * radius;
            return (
              <button
                key={it.key}
                onClick={it.onClick}
                title={it.label}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  color: "#444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  animation: `chat-rise 0.28s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both`,
                  zIndex: 1,
                }}
              >
                <it.Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Variant 6: row-horizontal ──────────────────────────────

  if (style === "row-horizontal") {
    return (
      <div className={wrapperClass}>
        <div ref={rootRef} className="fixed bottom-6 z-50 flex items-center gap-2" style={{ right: "var(--arc-logo-x, 24px)", flexDirection: "row-reverse" }}>
          <button style={triggerBase} onClick={onTriggerClick} aria-label={chatOpen ? "Close help" : "Options"}>
            {triggerContent}
          </button>
          {open && !chatOpen && items.map((it, i) => (
            <button
              key={it.key}
              onClick={it.onClick}
              className="cursor-pointer"
              style={{
                background: "white",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 13,
                color: "#1d1d1f",
                whiteSpace: "nowrap",
                animation: `slide-in-right 0.24s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both`,
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
        <style jsx>{`
          @keyframes slide-in-right {
            from { opacity: 0; transform: translateX(12px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Variant 7: bottom-sheet ────────────────────────────────

  if (style === "bottom-sheet") {
    return (
      <div className={wrapperClass}>
        <div ref={rootRef}>
          <div className="fixed bottom-6 z-50" style={{ right: "var(--arc-logo-x, 24px)" }}>
            <button style={triggerBase} onClick={onTriggerClick} aria-label={chatOpen ? "Close help" : "Options"}>
              {triggerContent}
            </button>
          </div>
          {open && !chatOpen && (
            <div
              className="fixed bottom-6 left-1/2 z-[49]"
              style={{
                transform: "translateX(-50%)",
                width: "min(320px, calc(100vw - 32px))",
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px) saturate(1.2)",
                WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 16,
                padding: 6,
                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                animation: "sheet-rise 0.26s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              {items.map((it) => (
                <button
                  key={it.key}
                  onClick={it.onClick}
                  className="cursor-pointer transition-colors duration-100 hover:bg-black/[0.04]"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 14px",
                    fontSize: 13,
                    color: "#1d1d1f",
                    textAlign: "left",
                    borderRadius: 10,
                  }}
                >
                  <span style={{ color: "#888", display: "flex" }}><it.Icon size={14} /></span>
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          )}
          <style jsx>{`
            @keyframes sheet-rise {
              from { opacity: 0; transform: translate(-50%, 16px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ── Variant 8: inline-morph ────────────────────────────────

  if (style === "inline-morph") {
    return (
      <div className={wrapperClass}>
        <div ref={rootRef} className="fixed bottom-6 z-50" style={{ right: "var(--arc-logo-x, 24px)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: chatOpen ? "var(--c-ink)" : "#F7F7F7",
              borderRadius: 999,
              padding: 2,
              transition: "width 260ms cubic-bezier(0.16,1,0.3,1), background 200ms",
              overflow: "hidden",
            }}
          >
            {open && !chatOpen && items.map((it, i) => (
              <button
                key={it.key}
                onClick={it.onClick}
                title={it.label}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "transparent",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "none",
                  animation: `fade-in 0.2s ease ${i * 40 + 80}ms both`,
                }}
              >
                <it.Icon size={13} />
              </button>
            ))}
            <button
              onClick={onTriggerClick}
              aria-label={chatOpen ? "Close help" : "Options"}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "transparent",
                color: chatOpen ? "white" : "#999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
              }}
            >
              {triggerContent}
            </button>
          </div>
          <style jsx>{`
            @keyframes fade-in {
              from { opacity: 0; transform: translateX(6px); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return null;
}

// ── Switcher UI ──────────────────────────────────────────────

export function MenuStyleSwitcher({
  style,
  onChange,
}: {
  style: MenuStyle;
  onChange: (s: MenuStyle) => void;
}) {
  return (
    <div
      className="fixed z-[201] flex items-center gap-1 px-1.5 py-1 rounded-full"
      style={{
        top: 72,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #ececec",
        boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
      }}
    >
      <span style={{ fontSize: 10, color: "#aaa", padding: "0 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>Menu</span>
      {MENU_STYLES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className="cursor-pointer transition-colors"
          data-active={s === style ? "true" : "false"}
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            fontSize: 10.5,
            color: s === style ? "white" : "#888",
            background: s === style ? "var(--c-ink)" : "transparent",
            border: "none",
          }}
        >
          {MENU_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
