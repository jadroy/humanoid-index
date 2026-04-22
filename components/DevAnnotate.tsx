"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Annotation = {
  id: string;
  route: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vw: number;
  vh: number;
  note: string;
  selector: string;
  elText: string;
  createdAt: number;
};

const STORAGE_KEY = "dev-annotate:v1";

function loadAll(): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(anns: Annotation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anns));
  } catch {}
}

function shortSelector(el: Element | null): string {
  if (!el) return "";
  const parts: string[] = [];
  let node: Element | null = el;
  for (let i = 0; i < 4 && node && node !== document.body; i++) {
    let seg = node.tagName.toLowerCase();
    if (node.id) {
      seg += `#${node.id}`;
      parts.unshift(seg);
      break;
    }
    const cls = (node.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(".");
    if (cls) seg += `.${cls}`;
    const parent: Element | null = node.parentElement;
    if (parent) {
      const tag = node.tagName;
      const siblings = Array.from(parent.children).filter((c) => c.tagName === tag);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        seg += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(seg);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function shortText(el: Element | null): string {
  if (!el) return "";
  const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
  return txt.length > 80 ? txt.slice(0, 80) + "…" : txt;
}

export default function DevAnnotate() {
  const pathname = usePathname() || "/";
  const [active, setActive] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setAnnotations(loadAll());
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    saveAll(annotations);
  }, [annotations]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const inEditable =
        !!tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          (tgt as HTMLElement).isContentEditable);

      if (
        e.shiftKey &&
        (e.key === "E" || e.key === "e") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        if (inEditable) return;
        e.preventDefault();
        setActive((v) => !v);
        setEditingId(null);
        setDraft(null);
      }

      if (e.key === "Escape" && active) {
        if (editingId) {
          setEditingId(null);
        } else {
          setActive(false);
          setDraft(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, editingId]);

  if (process.env.NODE_ENV !== "development") return null;
  if (!active) return null;

  const routeAnns = annotations.filter((a) => a.route === pathname);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-ann-interactive="1"]')) return;
    setEditingId(null);
    setDraft({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!draft) return;
    setDraft({ ...draft, x2: e.clientX, y2: e.clientY });
  };

  const onMouseUp = () => {
    if (!draft) return;
    const x = Math.min(draft.x1, draft.x2);
    const y = Math.min(draft.y1, draft.y2);
    const w = Math.abs(draft.x2 - draft.x1);
    const h = Math.abs(draft.y2 - draft.y1);
    setDraft(null);
    if (w < 6 || h < 6) return;

    const cx = x + w / 2;
    const cy = y + h / 2;
    let selector = "";
    let elText = "";
    if (overlayRef.current) {
      const prev = overlayRef.current.style.pointerEvents;
      overlayRef.current.style.pointerEvents = "none";
      const el = document.elementFromPoint(cx, cy);
      overlayRef.current.style.pointerEvents = prev || "";
      selector = shortSelector(el);
      elText = shortText(el);
    }

    const ann: Annotation = {
      id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      route: pathname,
      x,
      y,
      w,
      h,
      vw: window.innerWidth,
      vh: window.innerHeight,
      note: "",
      selector,
      elText,
      createdAt: Date.now(),
    };
    setAnnotations((all) => [...all, ann]);
    setEditingId(ann.id);
  };

  const updateNote = (id: string, note: string) =>
    setAnnotations((all) => all.map((a) => (a.id === id ? { ...a, note } : a)));
  const removeAnn = (id: string) => {
    setAnnotations((all) => all.filter((a) => a.id !== id));
    if (editingId === id) setEditingId(null);
  };
  const clearRoute = () => {
    setAnnotations((all) => all.filter((a) => a.route !== pathname));
    setEditingId(null);
  };
  const clearAll = () => {
    setAnnotations([]);
    setEditingId(null);
  };

  const copyFeedback = async () => {
    if (annotations.length === 0) {
      await navigator.clipboard.writeText("(no annotations)");
      return;
    }
    const byRoute = new Map<string, Annotation[]>();
    for (const a of annotations) {
      if (!byRoute.has(a.route)) byRoute.set(a.route, []);
      byRoute.get(a.route)!.push(a);
    }
    const lines: string[] = [];
    lines.push(`# Dev annotations (${annotations.length})`);
    lines.push(`viewport: ${window.innerWidth}×${window.innerHeight}`);
    lines.push("");
    for (const [route, list] of byRoute) {
      lines.push(`## route \`${route}\` (${list.length})`);
      list.forEach((a, i) => {
        const pctX = ((a.x / a.vw) * 100).toFixed(1);
        const pctY = ((a.y / a.vh) * 100).toFixed(1);
        const pctW = ((a.w / a.vw) * 100).toFixed(1);
        const pctH = ((a.h / a.vh) * 100).toFixed(1);
        lines.push("");
        lines.push(`### ${i + 1}. ${a.note.split("\n")[0] || "(no note)"}`);
        lines.push(`- box: ${pctX}% ${pctY}% · ${pctW}%×${pctH}% (captured at ${a.vw}×${a.vh})`);
        if (a.selector) lines.push(`- target: \`${a.selector}\``);
        if (a.elText) lines.push(`- text: "${a.elText}"`);
        if (a.note && a.note.includes("\n")) {
          lines.push("");
          lines.push(a.note);
        } else if (a.note) {
          lines.push(`- note: ${a.note}`);
        }
      });
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  const draftRect = draft && {
    x: Math.min(draft.x1, draft.x2),
    y: Math.min(draft.y1, draft.y2),
    w: Math.abs(draft.x2 - draft.x1),
    h: Math.abs(draft.y2 - draft.y1),
  };

  return (
    <div
      ref={overlayRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        cursor: "crosshair",
        background: "rgba(0,0,0,0.02)",
        userSelect: "none",
      }}
    >
      <div
        data-ann-interactive="1"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          padding: "6px 8px",
          background: "rgba(17,17,17,0.92)",
          color: "white",
          borderRadius: 8,
          fontSize: 12,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          cursor: "default",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ opacity: 0.7 }}>Annotate</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ opacity: 0.75, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pathname}
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ opacity: 0.7 }}>
          {routeAnns.length} here / {annotations.length} total
        </span>
        <button data-ann-interactive="1" onClick={copyFeedback} style={toolBtnStyle}>
          Copy feedback
        </button>
        <button data-ann-interactive="1" onClick={clearRoute} style={toolBtnStyle}>
          Clear page
        </button>
        <button data-ann-interactive="1" onClick={clearAll} style={toolBtnStyle}>
          Clear all
        </button>
        <button
          data-ann-interactive="1"
          onClick={() => setActive(false)}
          style={{ ...toolBtnStyle, background: "rgba(255,255,255,0.18)" }}
        >
          Exit (Esc)
        </button>
      </div>

      {routeAnns.map((a, i) => (
        <AnnotationBox
          key={a.id}
          ann={a}
          index={i + 1}
          editing={editingId === a.id}
          onEdit={() => setEditingId(a.id)}
          onNote={(v) => updateNote(a.id, v)}
          onRemove={() => removeAnn(a.id)}
          onDone={() => setEditingId(null)}
        />
      ))}

      {draftRect && (
        <div
          style={{
            position: "fixed",
            left: draftRect.x,
            top: draftRect.y,
            width: draftRect.w,
            height: draftRect.h,
            border: "1.5px dashed #2563eb",
            background: "rgba(37,99,235,0.08)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

const toolBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "white",
  border: "none",
  padding: "4px 8px",
  borderRadius: 5,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

function AnnotationBox({
  ann,
  index,
  editing,
  onEdit,
  onNote,
  onRemove,
  onDone,
}: {
  ann: Annotation;
  index: number;
  editing: boolean;
  onEdit: () => void;
  onNote: (v: string) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const popoverBelow = ann.y + ann.h + 150 < window.innerHeight;
  const popoverLeft = Math.min(ann.x, window.innerWidth - 300);
  const popoverTop = popoverBelow ? ann.y + ann.h + 6 : Math.max(8, ann.y - 140);

  return (
    <>
      <div
        data-ann-interactive="1"
        onMouseDown={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        style={{
          position: "fixed",
          left: ann.x,
          top: ann.y,
          width: ann.w,
          height: ann.h,
          border: "1.5px solid #dc2626",
          background: "rgba(220,38,38,0.06)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.6) inset",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -10,
            left: -10,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: "#dc2626",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {index}
        </div>
      </div>

      <div
        data-ann-interactive="1"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: popoverLeft,
          top: popoverTop,
          maxWidth: 300,
          background: "rgba(17,17,17,0.94)",
          color: "white",
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          cursor: "default",
        }}
      >
        {editing ? (
          <>
            <textarea
              ref={textareaRef}
              value={ann.note}
              onChange={(e) => onNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onDone();
                }
              }}
              placeholder="Describe the change you want here…"
              style={{
                width: 260,
                minHeight: 60,
                resize: "vertical",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: 6,
                fontSize: 12,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 6,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ opacity: 0.5, fontSize: 11 }}>#{index}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={onRemove} style={toolBtnStyle}>
                  Delete
                </button>
                <button
                  onClick={onDone}
                  style={{ ...toolBtnStyle, background: "rgba(255,255,255,0.18)" }}
                >
                  Done (⌘↵)
                </button>
              </div>
            </div>
          </>
        ) : (
          <div onClick={onEdit} style={{ maxWidth: 260, whiteSpace: "pre-wrap", cursor: "text" }}>
            {ann.note ? ann.note : <span style={{ opacity: 0.6 }}>Click to add note…</span>}
          </div>
        )}
      </div>
    </>
  );
}
