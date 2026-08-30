export type UploadTicket = {
  photoId: string;
  path: string;
  token: string;
  storageUrl: string;
  // PUT the client-generated JPEG renditions here.
  thumbnailUploadUrl: string;
  viewerUploadUrl: string;
};
