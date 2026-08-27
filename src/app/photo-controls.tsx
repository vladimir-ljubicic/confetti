"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function useServerAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(request: () => Promise<Response>): Promise<boolean> {
    setBusy(true);
    setFailed(false);
    const response = await request().catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setFailed(true);
      return false;
    }
    router.refresh();
    setBusy(false);
    return true;
  }

  return { busy, failed, run };
}
