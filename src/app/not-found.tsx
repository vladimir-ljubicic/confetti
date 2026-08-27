import { getDict, getLocale } from "@/lib/locale";
import { DeadLinkScreen } from "./dead-link-screen";

export default async function NotFound() {
  const locale = await getLocale();
  const dict = await getDict();

  return (
    <DeadLinkScreen
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
