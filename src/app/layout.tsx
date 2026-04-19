import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import SessionTimeoutProvider from "@/components/SessionTimeoutProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorProvider } from "@/providers/ErrorProvider";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityContext";
import AccessibilityToolbar from "@/components/accessibility/AccessibilityToolbar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AccommAlly",
  description: "Accommodation Tracking System",
  icons: {
    icon: '/icon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${instrumentSerif.variable} app-background`} suppressHydrationWarning>
        <AccessibilityProvider>
          <ErrorProvider>
            <SessionTimeoutProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                nonce={nonce}
              >
                {children}
                <AccessibilityToolbar />
              </ThemeProvider>
            </SessionTimeoutProvider>
          </ErrorProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
