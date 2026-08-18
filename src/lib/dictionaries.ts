import "server-only";
import type { Locale } from "./i18n";

const en = {
  meta: {
    title: "Jelena & Vladimir",
    description: "Wedding photos — share yours!",
  },
  gallery: {
    date: "September 20, 2026",
    empty: "No photos yet — be the first!",
    download: "Download",
  },
  upload: {
    add: "Add a photo",
    uploading: "Uploading… {percent}%",
    failed: "Upload failed",
  },
  // Describes switching TO the other language, so it stays understandable
  // to someone who doesn't speak the currently active one.
  localeToggle: {
    ariaLabel: "Пребаци на српски",
  },
} as const;

export type Dictionary = {
  readonly [Section in keyof typeof en]: {
    readonly [Key in keyof (typeof en)[Section]]: string;
  };
};

const sr: Dictionary = {
  meta: {
    title: "Јелена & Владимир",
    description: "Фотографије са венчања — поделите своје!",
  },
  gallery: {
    date: "20. 09. 2026.",
    empty: "Још нема фотографија — будите први!",
    download: "Преузми",
  },
  upload: {
    add: "Додај фотографију",
    uploading: "Отпремање… {percent}%",
    failed: "Отпремање није успело",
  },
  localeToggle: {
    ariaLabel: "Switch to English",
  },
};

const dictionaries: Record<Locale, Dictionary> = { sr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
