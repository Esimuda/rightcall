import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RightCall. Recall changes who you trust.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#121613",
          color: "#F4F6F1",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderTop: "4px solid #D6F25C",
              borderRight: "4px solid #FF6A3D",
            }}
          />
          <div style={{ fontSize: 28, letterSpacing: 4 }}>RIGHTCALL</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 84, lineHeight: 0.95, maxWidth: 900 }}>Recall changes who you trust.</div>
          <div style={{ fontSize: 28, color: "#B7C2B8" }}>Locked calls. Verified outcomes. Walrus memory.</div>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 22 }}>
          <div style={{ color: "#D6F25C" }}>FOLLOW 74%</div>
          <div style={{ color: "#FF6A3D" }}>FADE 36%</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
