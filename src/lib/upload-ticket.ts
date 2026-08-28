export type UploadTicket = {
  photoId: string;
  path: string;
  token: string;
  storageUrl: string;
  // PUT the client-generated JPEG thumbnail here.
  thumbnailUploadUrl: string;
};
