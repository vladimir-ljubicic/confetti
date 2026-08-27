// Contract for the export endpoints: 302 to a fresh signed URL when the
// zip is ready, 202 Accepted while it is still packing; never 404.
// The public zip holds public photos only; the admin zip adds private ones
// and sits behind the admin session.
export const EXPORT_PUBLIC_PATH = "/api/export/public";
export const EXPORT_ADMIN_PATH = "/api/export/admin";
export const EXPORT_PACKING_STATUS = 202;
