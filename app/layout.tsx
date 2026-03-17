import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Camp Registration",
  description:
    "Camp registration, invoice generation, and Google Apps Script submission flow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body text-ink">{children}</body>
    </html>
  );
}
