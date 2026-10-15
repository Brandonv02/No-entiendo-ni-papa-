import type { NextConfig } from "next";

// Exportación estática: sin servidor, ideal para Vercel y para precachear todo offline.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
