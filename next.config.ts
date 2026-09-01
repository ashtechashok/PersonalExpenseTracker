import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating dev-mode indicator (the "N" badge showing route/bundler
  // info). It only ever appears under `next dev`, never in a production build,
  // but we don't want it during local dev either.
  devIndicators: false,
};

export default nextConfig;
