"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseBulkProgress } from "@/lib/bulk-progress";

export function useServerAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(
    request: () => Promise<Response>,
    { refresh = true }: { refresh?: boolean } = {},
  ): Promise<boolean> {
    setBusy(true);
    setFailed(false);
    const response = await request().catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setFailed(true);
      return false;
    }
    if (refresh) router.refresh();
    setBusy(false);
    return true;
  }

  return { busy, failed, run };
}

type BulkState = {
  busy: boolean;
  failed: boolean;
  done: number;
  // Null until the first response sizes the job, and again once it is done.
  total: number | null;
};

const IDLE: BulkState = { busy: false, failed: false, done: 0, total: null };

// Drives a batched server action to completion: the route handles one batch
// per request and reports how many photos remain. A failed request keeps the
// progress made so far on screen; running again continues from there.
export function useBulkAction() {
  const router = useRouter();
  const [state, setState] = useState<BulkState>(IDLE);

  async function run(request: () => Promise<Response>): Promise<boolean> {
    let done = 0;
    let total: number | null = null;
    setState({ busy: true, failed: false, done, total });
    for (;;) {
      const response = await request().catch(() => null);
      const body = response ? await response.json().catch(() => null) : null;
      const step = parseBulkProgress(body);
      if (step) {
        done += step.done;
        total ??= done + step.remaining;
        setState({ busy: true, failed: false, done, total });
      }
      if (!response?.ok || !step) {
        setState({ busy: false, failed: true, done, total });
        router.refresh();
        return false;
      }
      if (step.remaining === 0) break;
    }
    router.refresh();
    setState(IDLE);
    return true;
  }

  function reset() {
    setState(IDLE);
  }

  return { ...state, run, reset };
}
