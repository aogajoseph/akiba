import type { Metadata } from "next";
import type { ReactNode } from "react";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import "./globals.css";
import "./group-creation-category.css";

const siteUrl = "https://akiba-kappa.vercel.app";
const shareTitle = "Akiba — Do More Together";
const shareDescription =
  "Group finance coordination platform, helping people plan events and achieve shared goals transparently.";
const shareImage = "/akiba-banner.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: shareTitle,
  description: shareDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Akiba",
    title: shareTitle,
    description: shareDescription,
    images: [
      {
        url: shareImage,
        alt: "Akiba — Do More Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: [shareImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="light" />
        {children}
      </body>
    </html>
  );
}
