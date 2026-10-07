import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maison Vale | Foundation",
  description: "Maison Vale is a premium lifestyle e-commerce portfolio application in development.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
