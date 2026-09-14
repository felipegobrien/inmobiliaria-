import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ercada — Encuentra tu próximo hogar en Colombia";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>
          <span style={{ color: "#6ee7b7" }}>Erca</span>
          <span style={{ color: "white" }}>da</span>
        </div>
        <div style={{ fontSize: 36, marginTop: 12, color: "#a7f3d0" }}>
          Encuentra tu próximo hogar en Colombia
        </div>
        <div style={{ fontSize: 26, marginTop: 28, color: "#d1fae5" }}>
          Apartamentos, casas y locales · venta y arriendo
        </div>
      </div>
    ),
    size,
  );
}
