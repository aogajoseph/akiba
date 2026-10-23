import type { Metadata } from "next";
import type { ReactNode } from "react";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akiba — Groups, together",
  description: "A collaborative space for groups to coordinate around shared events and goals.",
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
