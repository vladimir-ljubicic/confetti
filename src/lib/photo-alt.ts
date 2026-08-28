import { shortUploaderName } from "./uploader-name";

export type PhotoAltLabels = { photo: string; photoBy: string };

export function photoAltText(
  labels: PhotoAltLabels,
  uploader: { displayName: string } | null | undefined,
): string {
  const name = uploader ? shortUploaderName(uploader.displayName) : "";
  return name === "" ? labels.photo : labels.photoBy.replace("{name}", name);
}
