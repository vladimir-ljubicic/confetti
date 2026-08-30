import { parseUploadLimits } from "./upload-limits";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY"),
  adminPasscode: () => required("ADMIN_PASSCODE"),
  cronSecret: () => required("CRON_SECRET"),
  uploadLimits: () => parseUploadLimits(process.env),
};

export const PHOTOS_BUCKET = "photos";

// Public bucket holding public photos' renditions; objects are addressed by
// paths derived from the photo id, so URLs are unguessable without it.
export const RENDITIONS_BUCKET = "renditions";
