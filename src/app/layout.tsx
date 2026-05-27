import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Space Scout — Youth Soccer Tactics Trainer",
  description: "Learn soccer tactics through interactive matches and drills. Built for youth players who want to read the game better.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Scout",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1F6E3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
