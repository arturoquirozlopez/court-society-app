import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Court Society",
  description:
    "A private network for founders, investors, and operators who play tennis.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0E2A1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="viewport">{children}</div>
      </body>
    </html>
  );
}
