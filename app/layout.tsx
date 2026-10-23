import type { Metadata, Viewport } from "next";
import { Archivo, Figtree } from "next/font/google";
import { isDemoMode } from "@/lib/demo/mode";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Midas Media", template: "%s · Midas Media" },
  description: "Midas Media business app",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E2A36" },
    { media: "(prefers-color-scheme: dark)", color: "#081820" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-BW" className={`${archivo.variable} ${figtree.variable}`}>
      <body>
        {isDemoMode() ? (
          <div className="ribbon" role="note">
            Demo mode: dummy logins and sample data. Nothing here is real, and
            changes reset from time to time.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
