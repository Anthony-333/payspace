import { ImageResponse } from "next/og";

// The 1200×630 link-preview card shared by every opengraph-image route. Colours follow the
// landing hero: dark lead card, brand orange.
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ eyebrow, title, tags = [] }: { eyebrow: string; title: string; tags?: string[] }) {
  const titleSize = title.length > 70 ? 56 : title.length > 45 ? 66 : 76;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#1A1D23",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#ff6a13",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Payspace POS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.7)" }}>{eyebrow}</div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.08, maxWidth: 1040 }}>{title}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {tags.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  fontSize: 24,
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 26, color: "#ff6a13", fontWeight: 700 }}>payspace.shop</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
