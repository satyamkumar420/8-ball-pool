import type { Metadata } from "next";
import { Oswald, Outfit } from "next/font/google";
import "./globals.css";
import IntlProvider from "./IntlProvider";

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "8 Ball Billiards",
  description: "Play online 8 ball billiards with Bots and Friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${outfit.variable} h-full antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col">
        <IntlProvider>{children}</IntlProvider>
      </body>
    </html>
  );
}
