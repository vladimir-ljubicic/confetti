import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { ConfettiMark } from "./confetti-mark";
import { LocaleToggle } from "./locale-toggle";
import { UploadButton } from "./upload-button";

export function EmptyGallery({
  dict,
  locale,
  uploadsFrozen,
  needsProfile,
  limits,
  limitsExempt,
}: {
  dict: Dictionary;
  locale: Locale;
  uploadsFrozen: boolean;
  needsProfile: boolean;
  limits: { maxBatch: number; maxFileBytes: number };
  limitsExempt: boolean;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="flex items-center justify-between px-[18px] pt-3.5">
        <span className="flex items-center gap-1.5">
          <ConfettiMark size={14} variant="animated" />
          <span className="text-[11px] text-ink/45 uppercase tracking-[0.2em]">Confetti</span>
        </span>
        <LocaleToggle locale={locale} labels={{ ariaLabel: dict.localeToggle.ariaLabel }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[22px] px-[34px] pb-10 text-center">
        <span className="text-[11px] text-gold uppercase tracking-[0.28em]">
          {dict.gallery.eyebrow}
        </span>
        <h1 className="font-serif text-[48px] leading-[1.02] font-medium text-gold-small">
          Јелена
          <br />
          <span className="text-[32px] text-gold italic">и</span>
          <br />
          Владимир
        </h1>
        <div className="flex items-center gap-2.5 text-ink/35">
          <span className="block h-px w-[34px] bg-current" />
          <span className="text-meta tracking-[0.22em] text-ink/60">20 · 09 · 2026</span>
          <span className="block h-px w-[34px] bg-current" />
        </div>
        <p className="mt-1.5 font-serif text-[22px] leading-[1.45] text-ink/70 italic">
          {dict.gallery.emptyLine1}
          <br />
          {dict.gallery.emptyLine2}
        </p>
        {uploadsFrozen ? (
          <p className="max-w-md rounded-lg bg-sand px-6 py-4 text-sm text-ink/70">
            {dict.gallery.uploadsFrozen}
          </p>
        ) : (
          <UploadButton
            variant="inline"
            labels={dict.upload}
            sheetLabels={dict.introSheet}
            locale={locale}
            needsProfile={needsProfile}
            limits={limits}
            limitsExempt={limitsExempt}
          />
        )}
        <span className="max-w-[250px] text-meta leading-[1.6] text-ink/45">
          {dict.gallery.emptyFootnote}
        </span>
      </div>
    </main>
  );
}
