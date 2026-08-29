import type { Dictionary } from "@/lib/dictionaries";
import type { GuestBarLabels } from "./guest-bar";

export function guestBarLabels(dict: Dictionary): GuestBarLabels {
  return {
    backToGallery: dict.uploaderPage.backToGallery,
    photosOne: dict.uploaderPage.photosOne,
    photosFew: dict.uploaderPage.photosFew,
    photosMany: dict.uploaderPage.photosMany,
    myPhotos: dict.gallery.myPhotos,
    localeAriaLabel: dict.localeToggle.ariaLabel,
    sortLatest: dict.gallery.sortLatest,
    sortPopular: dict.gallery.sortPopular,
  };
}
