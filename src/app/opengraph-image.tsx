import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Gradient Code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            GC
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Gradient Code
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: "#94A3B8",
            maxWidth: 800,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Practical courses, projects and internships for developers
        </div>
      </div>
    ),
    { ...size }
  );
}
