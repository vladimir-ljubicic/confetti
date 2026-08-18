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
    myPhotos: "My photos",
    sortLive: "Live feed",
    sortChrono: "Chronological",
  },
  myPhotos: {
    title: "My photos",
    backToGallery: "Back to gallery",
    empty: "You haven't uploaded any photos yet.",
    defaultLabel: "Who can see your future uploads?",
    visibilityPublic: "Everyone",
    visibilityPrivate: "Only you and the newlyweds",
    privateBadge: "Private",
    makePublic: "Make public",
    makePrivate: "Make private",
    delete: "Delete",
    confirmDelete: "Delete this photo?",
    actionFailed: "That didn't work — try again",
  },
  uploaderPage: {
    backToGallery: "Back to gallery",
    empty: "No public photos yet.",
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
  admin: {
    title: "Admin",
    passcodeLabel: "Passcode",
    submit: "Enter",
    wrongPasscode: "Wrong passcode",
    backToGallery: "Back to gallery",
    signedIn: "You're signed in as admin.",
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
    myPhotos: "Моје фотографије",
    sortLive: "Уживо",
    sortChrono: "Хронолошки",
  },
  myPhotos: {
    title: "Моје фотографије",
    backToGallery: "Назад на галерију",
    empty: "Још нисте отпремили ниједну фотографију.",
    defaultLabel: "Ко може да види ваше будуће фотографије?",
    visibilityPublic: "Сви",
    visibilityPrivate: "Само ви и младенци",
    privateBadge: "Приватна",
    makePublic: "Учини јавном",
    makePrivate: "Учини приватном",
    delete: "Обриши",
    confirmDelete: "Обрисати ову фотографију?",
    actionFailed: "Није успело — покушајте поново",
  },
  uploaderPage: {
    backToGallery: "Назад на галерију",
    empty: "Још нема јавних фотографија.",
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
  admin: {
    title: "Администрација",
    passcodeLabel: "Лозинка",
    submit: "Уђи",
    wrongPasscode: "Погрешна лозинка",
    backToGallery: "Назад на галерију",
    signedIn: "Пријављени сте као администратор.",
  },
  localeToggle: {
    ariaLabel: "Switch to English",
  },
};

const dictionaries: Record<Locale, Dictionary> = { sr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
