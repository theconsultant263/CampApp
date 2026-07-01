import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Camp Hope 2026",
  description:
    "Final Camp Hope 2026 Camp Meeting updates, countdown, payment reminders, music lineup, and speaker profile.",
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
