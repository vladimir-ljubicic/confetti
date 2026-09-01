"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INTL_LOCALES, type Locale } from "@/lib/i18n";
import { DISPLAY_NAME_MAX_LENGTH, type Visibility } from "@/lib/uploader-profile";
import { ConfettiMark } from "./confetti-mark";
import { useSheetDismiss } from "./use-sheet-dismiss";
import { useVisualViewport } from "./use-visual-viewport";

// Fired on window when a guest saves their profile, with { displayName } as
// detail — chrome elsewhere on the page (e.g. the header) can react to it.
export const PROFILE_SAVED_EVENT = "confetti:profile-saved";

export type IntroSheetLabels = {
  title: string;
  explainerLine1: string;
  explainerLine2: string;
  firstNameLabel: string;
  lastNameLabel: string;
  lastNameOptional: string;
  visibilityLabel: string;
  visibilityPublicTitle: string;
  visibilityPublicSub: string;
  visibilityPrivateTitle: string;
  visibilityPrivateSub: string;
  submitOne: string;
  submitFew: string;
  submitMany: string;
  submitCompact: string;
  cancel: string;
  saveFailed: string;
};

// The two fields joined by a space must fit DISPLAY_NAME_MAX_LENGTH.
const FIELD_MAX_LENGTH = Math.floor((DISPLAY_NAME_MAX_LENGTH - 1) / 2);

// With less page than this on screen — the keyboard out, or a phone on its
// side — the sheet at full size would not fit whole.
const COMPACT_BELOW_PX = 560;

function submitLabel(labels: IntroSheetLabels, locale: Locale, count: number) {
  const category = new Intl.PluralRules(INTL_LOCALES[locale]).select(count);
  const template =
    category === "one"
      ? labels.submitOne
      : category === "few"
        ? labels.submitFew
        : labels.submitMany;
  return template.replace("{count}", String(count));
}

export function IntroSheet({
  labels,
  locale,
  fileCount,
  onSaved,
  onCancel,
}: {
  labels: IntroSheetLabels;
  locale: Locale;
  fileCount: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const { sheetProps, scrollProps, backdropStyle } = useSheetDismiss(onCancel);
  const lastNameField = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

  // Enter on the first field goes to the second rather than submitting the
  // form, which is what the browser would otherwise do. While a keyboard is
  // composing a word, Enter belongs to the composition.
  function advanceToLastName(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    lastNameField.current?.focus();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, defaultVisibility: visibility }),
      });
      if (!response.ok) throw new Error(`Saving profile failed (${response.status})`);
      window.dispatchEvent(
        new CustomEvent(PROFILE_SAVED_EVENT, { detail: { displayName } }),
      );
      onSaved();
    } catch (error) {
      console.error("Saving profile failed", error);
      setFailed(true);
      setSaving(false);
    }
  }

  const visibilityCards = [
    ["public", labels.visibilityPublicTitle, labels.visibilityPublicSub],
    ["private", labels.visibilityPrivateTitle, labels.visibilityPrivateSub],
  ] as const;

  const viewport = useVisualViewport();
  // Compact, the sheet gives up its ornaments so that both fields, the
  // visibility choice and the way out all stay in view above the keyboard.
  const compact = viewport !== null && viewport.height < COMPACT_BELOW_PX;

  // Portaled: an ancestor is position:sticky, whose stacking context would
  // otherwise trap the sheet below the gallery's sticky header bars. Sized to
  // the visible part of the page, so a keyboard laid over the page (rather
  // than shrinking it) still leaves the sheet fully on screen.
  return createPortal(
    <div
      className="pointer-events-auto fixed inset-x-0 top-0 z-50"
      style={
        viewport
          ? {
              height: viewport.height,
              transform: `translateY(${viewport.offsetTop}px)`,
            }
          : { height: "100%" }
      }
    >
      <button
        type="button"
        aria-label={labels.cancel}
        onClick={onCancel}
        style={backdropStyle}
        className="scrim-in absolute inset-0 cursor-default bg-ink/[0.42] [backdrop-filter:blur(3px)_opacity(0.5)]"
      />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={save}
        {...sheetProps}
        className="sheet-in absolute inset-x-0 bottom-0 mx-auto flex max-h-full w-full max-w-md flex-col rounded-sheet bg-card pt-3 shadow-sheet"
      >
        <span
          className={`h-1 w-[38px] shrink-0 self-center rounded-full bg-ink/15 ${
            compact ? "mb-3" : "mb-5"
          }`}
        />

        {compact && (
          <div className="mx-[22px] flex shrink-0 items-baseline justify-between gap-4 border-b border-ink/10 pb-3">
            <h2
              id={titleId}
              className="font-serif text-[22px] leading-tight font-medium text-gold-small"
            >
              {labels.title}
            </h2>
            <p className="text-meta text-ink/50">{labels.explainerLine2}</p>
          </div>
        )}

        {!compact && (
          <div className="flex shrink-0 flex-col items-center gap-[7px] px-[22px] pb-5 text-center">
            <ConfettiMark size={22} variant="static" />
            <h2 id={titleId} className="font-serif text-sheet-title font-medium text-gold-small">
              {labels.title}
            </h2>
            <p className="text-body leading-[1.55] text-ink/55">
              {labels.explainerLine1}
              <br />
              {labels.explainerLine2}
            </p>
          </div>
        )}

        <div
          {...scrollProps}
          className={`flex min-h-0 flex-col overflow-y-auto overscroll-contain px-[22px] ${
            compact ? "gap-4 pt-4" : "gap-5"
          }`}
        >
          <div className="flex gap-2.5">
            <label className="flex min-w-0 flex-1 flex-col gap-[7px]">
              <span className="eyebrow text-ink/50">{labels.firstNameLabel}</span>
              <input
                required
                type="text"
                inputMode="text"
                autoComplete="given-name"
                autoCapitalize="words"
                value={firstName}
                maxLength={FIELD_MAX_LENGTH}
                onChange={(event) => setFirstName(event.target.value)}
                onKeyDown={advanceToLastName}
                className="w-full touch-auto rounded-card border border-ink/16 bg-card px-4 py-3.5 text-[17px] text-ink caret-gold outline-none focus:border-gold focus:bg-paper"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-[7px]">
              <span className="eyebrow text-ink/50">
                {labels.lastNameLabel}{" "}
                <span className="tracking-normal normal-case text-ink/60">
                  · {labels.lastNameOptional}
                </span>
              </span>
              <input
                ref={lastNameField}
                type="text"
                inputMode="text"
                autoComplete="family-name"
                autoCapitalize="words"
                value={lastName}
                maxLength={FIELD_MAX_LENGTH}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full touch-auto rounded-card border border-ink/16 bg-card px-4 py-3.5 text-[17px] text-ink caret-gold outline-none placeholder:text-ink/50 focus:border-gold focus:bg-paper"
              />
            </label>
          </div>

          <div className={compact ? undefined : "flex flex-col gap-[9px]"}>
            <span
              id={`${titleId}-visibility`}
              className={compact ? "sr-only" : "eyebrow text-ink/45"}
            >
              {labels.visibilityLabel}
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${titleId}-visibility`}
              className="flex gap-[9px]"
            >
              {visibilityCards.map(([value, title, sub]) => {
                const selected = visibility === value;
                return compact ? (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setVisibility(value)}
                    className={`flex min-h-12 flex-1 items-center gap-2.5 rounded-pill px-4 text-left transition ${
                      selected
                        ? "border-[1.5px] border-gold bg-gold-tint"
                        : "border border-ink/14 bg-card"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        selected ? "bg-gold" : "border border-ink/30"
                      }`}
                    />
                    <span className={`text-[15px] ${selected ? "text-ink" : "text-ink/75"}`}>
                      {title}
                    </span>
                  </button>
                ) : (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setVisibility(value)}
                    className={`flex flex-1 flex-col gap-[3px] rounded-card p-3.5 text-left transition ${
                      selected
                        ? "border-[1.5px] border-gold bg-gold-tint"
                        : "border border-ink/14 bg-card"
                    }`}
                  >
                    <span className={`text-[15px] ${selected ? "text-ink" : "text-ink/75"}`}>
                      {title}
                    </span>
                    <span
                      className={`text-meta leading-[1.4] ${selected ? "text-ink/50" : "text-ink/45"}`}
                    >
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Below the fields rather than after them, so that the way out stays
            in reach however little of them the keyboard leaves room for. */}
        {compact ? (
          <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-ink/10 px-[22px] pt-3 pb-[18px]">
            {failed && <p className="text-center text-sm text-danger">{labels.saveFailed}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex min-h-11 shrink-0 items-center px-2 text-[13px] text-ink/60 transition hover:text-ink active:text-ink"
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={displayName.length === 0 || saving}
                className="min-h-12 flex-1 rounded-pill bg-gold px-5 text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60"
              >
                {labels.submitCompact.replace("{count}", String(fileCount))}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 flex-col gap-5 px-[22px] pt-5 pb-[26px]">
            {failed && <p className="text-center text-sm text-danger">{labels.saveFailed}</p>}

            <button
              type="submit"
              disabled={displayName.length === 0 || saving}
              className="w-full rounded-pill bg-gold py-[17px] text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60"
            >
              {submitLabel(labels, locale, fileCount)}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex min-h-11 items-center self-center text-[13px] text-ink/60 transition hover:text-ink active:text-ink"
            >
              {labels.cancel}
            </button>
          </div>
        )}
      </form>
    </div>,
    document.body,
  );
}
