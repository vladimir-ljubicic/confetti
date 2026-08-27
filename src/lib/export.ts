// Contract for GET /api/export/public: 302 to a fresh signed URL when the
// zip is ready, 202 Accepted while it is still packing; never 404.
export const EXPORT_PUBLIC_PATH = "/api/export/public";
export const EXPORT_PACKING_STATUS = 202;
