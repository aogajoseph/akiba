import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = { title: "Akiba — Financial Universes, together", description: "A collaborative financial platform for groups to coordinate, communicate, and build trust around shared financial purposes." };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
