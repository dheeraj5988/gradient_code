import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Code Gradient";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-21 50 720 720"><defs>
    <linearGradient id="body" gradientUnits="userSpaceOnUse" x1="40" y1="520" x2="400" y2="150">
      <stop offset="0" stop-color="#00cfff"/><stop offset=".45" stop-color="#1089ff"/><stop offset="1" stop-color="#1a4dff"/>
    </linearGradient>
    <linearGradient id="arm" gradientUnits="userSpaceOnUse" x1="370" y1="90" x2="590" y2="260">
      <stop offset="0" stop-color="#17a2ff"/><stop offset="1" stop-color="#7a5cff"/>
    </linearGradient>
    <linearGradient id="top" gradientUnits="userSpaceOnUse" x1="345" y1="420" x2="640" y2="450">
      <stop offset="0" stop-color="#a72cff"/><stop offset="1" stop-color="#e03cff"/>
    </linearGradient>
    <linearGradient id="side" gradientUnits="userSpaceOnUse" x1="640" y1="470" x2="500" y2="690">
      <stop offset="0" stop-color="#d93bff"/><stop offset="1" stop-color="#9a22ff"/>
    </linearGradient>
    <linearGradient id="dark" gradientUnits="userSpaceOnUse" x1="375" y1="600" x2="500" y2="750">
      <stop offset="0" stop-color="#2a14ff"/><stop offset="1" stop-color="#3b12e8"/>
    </linearGradient>
  </defs>
  <g stroke-linejoin="round" stroke-width="22">
    <polygon points="378,70 378,208 178,330 178,470 384,596 384,750 48,544 48,276" fill="url(#body)" stroke="url(#body)"/>
    <polygon points="378,70 592,205 485,272 378,208" fill="url(#arm)" stroke="url(#arm)"/>
    <polygon points="354,420 470,352 628,450 500,528" fill="url(#top)" stroke="url(#top)"/>
    <polygon points="500,530 630,456 630,598 500,684" fill="url(#side)" stroke="url(#side)"/>
    <polygon points="384,602 500,534 500,684 384,750" fill="url(#dark)" stroke="url(#dark)"/>
  </g>

</svg>`
)}`;

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} width={96} height={96} alt="" />
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            <span>Code&nbsp;</span>
            <span style={{ color: "#6a7dff" }}>Gradient</span>
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
