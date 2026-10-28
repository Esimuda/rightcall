import type { Metadata } from "next";
import { IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "RightCall",
  description: "Prediction intelligence that learns who deserves trust. Locked calls, verified outcomes, Walrus memory.",
  metadataBase: new URL("http://127.0.0.1:38471"),
  openGraph: {
    title: "RightCall",
    description: "Recall changes who you trust.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${instrument.variable} antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
