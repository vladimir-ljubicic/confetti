export type UploadTicket = {
  photoId: string;
  path: string;
  token: string;
  storageUrl: string;
  // Present when the file needs a client-generated thumbnail; PUT the JPEG here.
  thumbnailUploadUrl: string | null;
};
