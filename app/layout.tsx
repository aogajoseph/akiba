import type { Metadata } from "next";
import type { ReactNode } from "react";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { createClient } from "@/lib/supabase/server";
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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let akibaTheme: "light" | "dark" | "system" = "system";
  if (user) {
    const { data: settings } = await supabase.from("akiba_user_settings").select("theme").eq("user_id", user.id).maybeSingle();
    if (settings?.theme === "light" || settings?.theme === "dark" || settings?.theme === "system") akibaTheme = settings.theme;
  }
  return (
    <html lang="en" data-akiba-theme={akibaTheme} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="light" />
        {children}
      </body>
    </html>
  );
}
