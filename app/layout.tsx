import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "JUNIOUS — Your Personal Gym Plan",
    description:
      "Turn your schedule, recovery, nutrition habits and training goal into a practical weekly gym plan.",
    openGraph: {
      title: "JUNIOUS — A week that fits your body.",
      description:
        "An explainable weekly gym plan shaped around your body and real life.",
      images: [{ url: "/og-junious.png", width: 1792, height: 933 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "JUNIOUS — A week that fits your body.",
      description:
        "An explainable weekly gym plan shaped around your body and real life.",
      images: ["/og-junious.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
