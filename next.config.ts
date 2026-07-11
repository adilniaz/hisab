import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonce-based CSP: this app has no third-party scripts and doesn't need
// per-request dynamic rendering everywhere just to serve a nonce. Next.js's
// own inline hydration scripts and Tailwind/recharts inline styles require
// 'unsafe-inline', per Next's documented "without nonces" CSP pattern.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`;

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // The remaining security headers (X-Frame-Options, HSTS, etc.) are
          // set by src/proxy.ts — the standardized cross-project location.
          { key: "Content-Security-Policy", value: cspHeader.replace(/\n/g, "") },
        ],
      },
    ];
  },
};

export default nextConfig;
