import type { NextConfig } from "next";
// Mobile (Capacitor) build: static export, no server features.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // dynamic [lessonId]/[courseId] are client-rendered; export needs them allowed
  // (handled via generateStaticParams in the pages, added in the mobile build).
};
export default nextConfig;
