import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server hydrate correctly when opened from another device on the
  // same network (e.g. a phone) — without this, Next.js blocks the HMR websocket
  // for non-localhost origins and the page never finishes hydrating client-side.
  allowedDevOrigins: ['192.168.1.161'],
};

export default nextConfig;
