import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import { getDictionary } from "@/lib/dictionaries";
import { getDict, getLocale } from "@/lib/locale";
import { LocaleToggle } from "./locale-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["500", "600"],
  subsets: ["latin", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <div className="absolute top-4 right-4">
          <LocaleToggle locale={locale} labels={dict.localeToggle} />
        </div>
        {children}
      </body>
    </html>
  );
}
