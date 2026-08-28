import { getDict, getLocale } from "@/lib/locale";
import { ErrorScreen } from "./error-screen";

export default async function NotFound() {
  const locale = await getLocale();
  const dict = await getDict();

  return (
    <ErrorScreen
      locale={locale}
      labels={{
        titleLine1: dict.deadLink.titleLine1,
        titleLine2: dict.deadLink.titleLine2,
        body: dict.deadLink.body,
        retry: dict.deadLink.retry,
        localeAriaLabel: dict.localeToggle.ariaLabel,
      }}
    />
  );
}
