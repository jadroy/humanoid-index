// Dev-only phone harness — /dev/mobile. Iframes the mobile deck at a set of
// real device sizes so it can be checked from a desktop browser without
// resizing the window.
const SCALE = 0.62;

const DEVICES = [
  { label: "iPhone 15 Pro", w: 393, h: 852 },
  { label: "iPhone SE", w: 375, h: 667 },
  { label: "Pixel 8 Pro", w: 412, h: 892 },
];

export default function MobileHarness() {
  return (
    <main style={{ minHeight: "100vh", background: "#EDEDF2", padding: 32 }}>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {DEVICES.map((d) => (
          <div key={d.label}>
            <div style={{ fontSize: 12, color: "#747484", marginBottom: 10, fontFamily: "system-ui" }}>
              {d.label} · {d.w}×{d.h}
            </div>
            {/* Scaled to fit a laptop viewport. Transform is purely visual —
                the iframe still lays out at the real device width. */}
            <div style={{ width: d.w * SCALE, height: d.h * SCALE }}>
              <iframe
                src="/dev/mobile/frame"
                width={d.w}
                height={d.h}
                style={{
                  border: "none",
                  borderRadius: 34,
                  background: "#fff",
                  boxShadow: "0 0 0 8px #1a1a1a, 0 24px 60px rgba(0,0,0,0.22)",
                  transform: `scale(${SCALE})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
