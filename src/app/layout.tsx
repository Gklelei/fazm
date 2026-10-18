import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ReactQueryClientProvider from "@/providers/ReactQueryProvider";
import { Toaster } from "sonner";
import { getCachedAcademy } from "@/lib/academy-cache";
import { themeAttributes } from "@/lib/brand-color";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Fazam Football Academy",
    default: "Fazam Football Academy | Professional Management System",
  },
  description:
    "The official management platform for Fazam Football Academy. Streamlining athlete enrollment, financial tracking, and sports performance management.",
  keywords: [
    "Football Academy",
    "Nairobi",
    "Sports Management",
    "Athlete Tracking",
    "Fazam Academy",
  ],
  authors: [{ name: "gklelei" }],
  creator: "Fazam Football Academy",
  publisher: "Fazam Football Academy",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/Fazam Logo Half.jpg",
  },

  // openGraph: {
  //   type: "website",
  //   locale: "en_KE",
  //   url: "https://your-domain.com",
  //   siteName: "Fazam Academy Portal",
  //   title: "Fazam Football Academy Management System",
  //   description:
  //     "Secure portal for athletes, parents, and coaches of Fazam Football Academy.",
  //   images: [
  //     {
  //       url: "/Fazam Logo Half.jpg",
  //       width: 1200,
  //       height: 630,
  //       alt: "Fazam Football Academy Logo",
  //     },
  //   ],
  // },

  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The academy colour comes with the page (cached), so no page waits on a
  // client fetch for it. A failed lookup falls back to the Fazam colours.
  const academy = await getCachedAcademy().catch(() => null);

  return (
    <html
      lang="en"
      {...themeAttributes(academy?.primaryColor)}
      suppressHydrationWarning
    >
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryClientProvider>
            {children}
            <Toaster
              closeButton
              duration={5000}
              richColors
              position="top-right"
              theme="system"
            />
          </ReactQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
