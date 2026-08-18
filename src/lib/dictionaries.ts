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
    add: "Add photos",
    uploading: "Uploading {done}/{total}…",
    fileFailed: "Failed",
    someFailed: "Some photos didn't upload",
  },
  firstUploadDialog: {
    title: "Introduce yourself",
    nameLabel: "Your name",
    nameHint: "Shown next to your photos",
    visibilityLabel: "Who can see your photos?",
    visibilityPublic: "Everyone",
    visibilityPrivate: "Only you and the newlyweds",
    submit: "Save & upload",
    cancel: "Cancel",
    saveFailed: "Saving failed — try again",
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
    add: "Додај фотографије",
    uploading: "Отпремање {done}/{total}…",
    fileFailed: "Није успело",
    someFailed: "Неке фотографије нису отпремљене",
  },
  firstUploadDialog: {
    title: "Представите се",
    nameLabel: "Ваше име",
    nameHint: "Приказује се уз ваше фотографије",
    visibilityLabel: "Ко може да види ваше фотографије?",
    visibilityPublic: "Сви",
    visibilityPrivate: "Само ви и младенци",
    submit: "Сачувај и отпреми",
    cancel: "Откажи",
    saveFailed: "Чување није успело — покушајте поново",
  },
  localeToggle: {
    ariaLabel: "Switch to English",
  },
};

const dictionaries: Record<Locale, Dictionary> = { sr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
