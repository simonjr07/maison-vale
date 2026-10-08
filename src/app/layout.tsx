import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL?.trim() || "http://localhost:3000"),
  title: {
    default: "Maison Vale",
    template: "%s | Maison Vale",
  },
  description:
    "Considered apparel and objects designed for daily life by Maison Vale.",
  openGraph: {
    title: "Maison Vale",
    description: "Considered apparel and objects designed for daily life.",
    images: [{ url: "/catalogue/photography/maison-vale-editorial-hero.webp", alt: "Maison Vale apparel and objects in a warm studio setting" }],
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
