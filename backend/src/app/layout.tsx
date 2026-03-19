import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Wardrobe - Smart Clothing Management",
  description: "Manage your wardrobe with AI-powered clothing organization, laundry tracking, and outfit suggestions.",
  keywords: ["wardrobe", "clothing", "fashion", "laundry", "outfits", "AI"],
  authors: [{ name: "Digital Wardrobe Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Digital Wardrobe",
    description: "AI-powered clothing management and organization",
    url: "https://chat.z.ai",
    siteName: "Digital Wardrobe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Wardrobe",
    description: "AI-powered clothing management and organization",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
