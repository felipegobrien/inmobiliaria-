import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Inmobiliaria — Encuentra tu próximo hogar en Colombia";

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
        <div style={{ fontSize: 90, marginBottom: 10 }}>🏠</div>
        <div style={{ fontSize: 72, fontWeight: 800 }}>Inmobiliaria</div>
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
