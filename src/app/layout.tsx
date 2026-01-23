import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionTimeoutProvider from "@/components/SessionTimeoutProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AccommAlly",
  description: "Accommodation Tracking System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SessionTimeoutProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionTimeoutProvider>
      </body>
    </html>
  );
}
