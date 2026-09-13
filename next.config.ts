import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The browser talks to Convex directly: the sync WebSocket, photo uploads and storage URLs.
// Everything else (pages, auth routes under /api/auth) is same-origin.
const convex = new URL(process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://convex.invalid");
const convexHttp = convex.origin;
const convexWs = `wss://${convex.host}`;

// No nonces: the app is mostly dynamic already, but nonces would force every page dynamic
// (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md, "Without Nonces").
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${convexHttp}`,
  "font-src 'self'",
  `connect-src 'self' ${convexHttp} ${convexWs}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera stays available to the app itself for barcode scanning later.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
