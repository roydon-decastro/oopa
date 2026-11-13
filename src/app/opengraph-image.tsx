import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Oopa: rentals across the Philippines";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#047857", color: "white" }}>
        <div style={{ fontSize: 96, fontWeight: 800 }}>Oopa</div>
        <div style={{ fontSize: 48, marginTop: 24 }}>Apartments, condos and rooms for rent across the Philippines</div>
        <div style={{ fontSize: 32, marginTop: 32, opacity: 0.85 }}>See rent, deposit and utilities upfront · Apply online</div>
      </div>
    ),
    size,
  );
}
