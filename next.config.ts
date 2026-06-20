import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Force the Android app to download with the correct type.
        source: "/soccer-iq-lab.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: 'attachment; filename="soccer-iq-lab.apk"' },
        ],
      },
    ];
  },
};

export default nextConfig;
