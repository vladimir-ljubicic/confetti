function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  // Image transforms need Supabase Pro; off = serve signed original URLs (dev).
  imageTransformsEnabled: () => process.env.SUPABASE_IMAGE_TRANSFORMS === "true",
  adminPasscode: () => required("ADMIN_PASSCODE"),
};

export const PHOTOS_BUCKET = "photos";
