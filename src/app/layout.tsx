import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { getDictionary } from "@/lib/dictionaries";
import { getDict, getLocale } from "@/lib/locale";
import { LocaleToggle } from "./locale-toggle";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin", "cyrillic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["400", "500"],
  style: ["normal", "italic"],
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
      className={`${jost.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <div className="absolute top-4 right-4">
          <LocaleToggle locale={locale} labels={dict.localeToggle} />
        </div>
        {children}
      </body>
    </html>
  );
}
