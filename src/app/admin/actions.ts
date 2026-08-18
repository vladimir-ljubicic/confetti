"use server";

import { redirect } from "next/navigation";
import { grantAdminSession } from "@/lib/admin-session";
import { passcodeMatches } from "@/lib/admin-token";
import { env } from "@/lib/env";

export type LoginState = { wrongPasscode: boolean };

export async function loginAdmin(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const passcode = formData.get("passcode");
  if (typeof passcode !== "string" || !passcodeMatches(env.adminPasscode(), passcode)) {
    return { wrongPasscode: true };
  }
  await grantAdminSession();
  redirect("/admin");
}
