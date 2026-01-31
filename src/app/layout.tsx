import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ReactQueryClientProvider from "@/lib/ReactQueryClientProvider";
import { UtilsProviderWrapper } from "@/Modules/Settings/UtilsProvider";
import { Toaster } from "sonner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryClientProvider>
            <UtilsProviderWrapper>
              {children}
              <Toaster
                closeButton
                duration={5000}
                richColors
                position="top-right"
              />
            </UtilsProviderWrapper>
          </ReactQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
