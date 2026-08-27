import { getDictionary } from "@/lib/dictionaries";
import { getLocale } from "@/lib/locale";
import { LocaleToggle } from "./locale-toggle";

export async function LocaleCorner() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="absolute top-4 right-4">
      <LocaleToggle locale={locale} labels={dict.localeToggle} />
    </div>
  );
}
