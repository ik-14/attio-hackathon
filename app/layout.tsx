import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Strike — Autonomous outreach for Attio",
  description:
    "Strike finds, enriches, and reaches out to your ideal customers automatically — personalised email + postcard, closed in your Attio CRM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full" style={{ fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#15131f",
              color: "#fff",
              border: "none",
              borderRadius: "100px",
              fontSize: "13px",
              fontWeight: "600",
            },
          }}
        />
      </body>
    </html>
  );
}
