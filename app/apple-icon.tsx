import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #6366f1 0%, #7c3aed 55%, #db2777 100%)",
          borderRadius: 40,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="env" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>

          <g transform="translate(0 1)">
            <rect
              x="5.5"
              y="10.5"
              width="21"
              height="13.5"
              rx="2"
              fill="url(#env)"
            />
            <path
              d="M5.5 12 L16 19.2 L26.5 12"
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5.5 24 L13.5 17.5 M26.5 24 L18.5 17.5"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>

          <path
            d="M24 4.2 L24.8 6.6 L27.2 7.4 L24.8 8.2 L24 10.6 L23.2 8.2 L20.8 7.4 L23.2 6.6 Z"
            fill="#fde047"
          />
          <path
            d="M28.3 11.4 L28.7 12.6 L29.9 13 L28.7 13.4 L28.3 14.6 L27.9 13.4 L26.7 13 L27.9 12.6 Z"
            fill="#fef3c7"
          />
          <path
            d="M21 10 L21.3 10.9 L22.2 11.2 L21.3 11.5 L21 12.4 L20.7 11.5 L19.8 11.2 L20.7 10.9 Z"
            fill="#fef3c7"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
