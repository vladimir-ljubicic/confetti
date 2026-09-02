"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Held = { id: string; pushed: boolean };

// Everything this module records on a history entry lives under one key, so
// nested surfaces (a sheet over the viewer) each keep their own marker on
// the same entry and none of it collides with the router's own state.
function heldAll(state: unknown): Record<string, unknown> {
  if (typeof state !== "object" || state === null) return {};
  const held = (state as Record<string, unknown>).held;
  return typeof held === "object" && held !== null
    ? (held as Record<string, unknown>)
    : {};
}

function heldEntry(state: unknown, key: string): Held | null {
  const held = heldAll(state)[key];
  if (typeof held !== "object" || held === null) return null;
  const { id, pushed } = held as Record<string, unknown>;
  return typeof id === "string" && typeof pushed === "boolean"
    ? { id, pushed }
    : null;
}

function stateWith(key: string, held: Held | null) {
  const all = { ...heldAll(window.history.state) };
  if (held === null) delete all[key];
  else all[key] = held;
  return { held: all };
}

function addressWith(key: string, id: string | null): string {
  const url = new URL(window.location.href);
  if (id === null) url.searchParams.delete(key);
  else url.searchParams.set(key, id);
  return `${url.pathname}${url.search}${url.hash}`;
}

// Chrome lets a page add one history entry per user gesture; an entry added
// without one makes the back button skip every entry this page has added.
// That gesture is not the fleeting kind: it stands until the page writes to
// history, however long a photo picker takes in between. The same
// bookkeeping is kept here — a gesture arms it, a write spends it — and
// nothing is pushed unarmed; the surface then simply has no entry of its
// own, and going back leaves as it always did.
let armed: boolean | null = null;

function arm(event: Event) {
  if (event instanceof KeyboardEvent && event.key === "Escape") return;
  armed = true;
}

function gestureArmed(): boolean {
  if (armed === null) {
    armed = navigator.userActivation?.hasBeenActive ?? true;
    for (const type of ["pointerdown", "pointerup", "keydown", "touchend"]) {
      window.addEventListener(type, arm, { capture: true, passive: true });
    }
  }
  return armed;
}

function spendGesture() {
  armed = false;
}

// Stepping back onto the page's own entry would otherwise restore the scroll
// position the page had when the entry above it was pushed, undoing wherever
// the surface has scrolled the page to since — a viewer keeps the gallery on
// the photo it is showing, and closing it must land there.
let holding = 0;
let restorationBefore: History["scrollRestoration"] | null = null;

function holdScroll() {
  if (holding++ > 0) return;
  restorationBefore = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
}

function releaseScroll() {
  if (--holding > 0 || restorationBefore === null) return;
  window.history.scrollRestoration = restorationBefore;
  restorationBefore = null;
}

// A history entry held for as long as the surface using this hook is
// mounted, so that going back closes the surface instead of leaving the
// page. The router is told nothing; the surface renders from its own state.
//
// Named by an `id`, the entry's address carries `?<key>=<id>` and follows
// `id` in place, so a reload or a shared link comes back to the same thing.
// The entry is pushed on mount unless the address already names `id` — a
// shared link, a reload, or history stepped back onto it — in which case
// the entry already there is taken over. Behind a taken-over entry that was
// never pushed there may be nothing of this site, so leaving it clears the
// address in place rather than stepping back.
//
// Without an `id`, the entry is unnamed: it changes no address, is never
// found again, and pops itself when the surface unmounts without having
// left — its owner closes it by simply no longer rendering it.
//
// `onBack` runs once the entry is gone, whether the user went back or the
// returned `leave` was called; `leave(then)` runs `then` in its place.
// `handOver(then)` gives the entry itself up to whatever `then` puts in its
// place, so the two share one entry and one step back leaves both.
export function useHistoryEntry({
  key,
  id,
  onBack,
}: {
  key: string;
  id?: string;
  onBack: () => void;
}) {
  const named = id !== undefined;
  const [token] = useState(() => id ?? Math.random().toString(36).slice(2));
  const held = id ?? token;
  // null until the mount effect has settled which entry is held.
  const pushed = useRef<boolean | null>(null);
  // Set while stepping back out; runs on the popstate that follows.
  const pending = useRef<(() => void) | null>(null);
  const gone = useRef(false);
  const unmountPop = useRef<number | null>(null);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    holdScroll();
    return releaseScroll;
  }, []);

  useEffect(() => {
    if (unmountPop.current !== null) {
      window.clearTimeout(unmountPop.current);
      unmountPop.current = null;
    }
    if (gone.current || pending.current !== null) return;
    if (pushed.current === null) {
      const current = heldEntry(window.history.state, key);
      if (named && current?.id === held) {
        pushed.current = current.pushed;
        return;
      }
      const addressed =
        named && new URL(window.location.href).searchParams.get(key) === held;
      pushed.current = !addressed && gestureArmed();
      const marker = { id: held, pushed: pushed.current };
      if (pushed.current) {
        window.history.pushState(
          stateWith(key, marker),
          "",
          named ? addressWith(key, held) : undefined,
        );
        spendGesture();
      } else if (named) {
        window.history.replaceState(
          stateWith(key, marker),
          "",
          addressWith(key, held),
        );
        spendGesture();
      }
      return;
    }
    if (!named) return;
    window.history.replaceState(
      stateWith(key, { id: held, pushed: pushed.current }),
      "",
      addressWith(key, held),
    );
    spendGesture();
  }, [key, named, held]);

  // An unnamed entry nobody left still sits on top of history when its
  // surface goes; popping it is deferred a tick so that an effect re-run
  // that mounts the surface again keeps the entry instead.
  useEffect(() => {
    if (named) return;
    return () => {
      if (!pushed.current || gone.current || pending.current !== null) return;
      unmountPop.current = window.setTimeout(() => {
        unmountPop.current = null;
        gone.current = true;
        window.history.back();
      }, 0);
    };
  }, [named]);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      if (gone.current) return;
      if (heldEntry(event.state, key)?.id === held) {
        // Still on the entry after stepping back: an entry above it, left
        // behind by a surface that has since gone, was popped instead.
        if (pending.current !== null) window.history.back();
        return;
      }
      gone.current = true;
      const then = pending.current ?? onBackRef.current;
      pending.current = null;
      then();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [key, held]);

  // The surface goes and the entry stays, cleared of its marker and its
  // address, for `then` to make into whatever comes next. Nothing traverses,
  // so there is no moment at which the entry still names the surface. `then`
  // is told whether the entry it takes over has one of this page's own behind
  // it, which a taken-over entry need not have.
  const handOver = useCallback(
    (then: (steppable: boolean) => void) => {
      if (gone.current || pending.current !== null) return;
      gone.current = true;
      const steppable = pushed.current === true;
      if (named) {
        window.history.replaceState(
          stateWith(key, null),
          "",
          addressWith(key, null),
        );
      }
      then(steppable);
    },
    [key, named],
  );

  const leave = useCallback(
    (then?: () => void) => {
      if (gone.current || pending.current !== null) return;
      if (!pushed.current) {
        handOver(then ?? onBackRef.current);
        return;
      }
      pending.current = then ?? onBackRef.current;
      window.history.back();
    },
    [handOver],
  );

  return useMemo(() => ({ leave, handOver }), [leave, handOver]);
}

// The id the address asks `key` to show: read once on mount from the query
// string, then from each history entry the user steps onto that holds one.
// The caller acts on it when it can and clears it. While `paused`, stepping
// through history belongs to whoever holds the current entry, and nothing is
// picked up.
export function useAddressedEntry(
  key: string,
  paused: boolean,
): { id: string | null; clear: () => void } {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(new URL(window.location.href).searchParams.get(key));
  }, [key]);

  useEffect(() => {
    if (paused) return;
    function onPopState(event: PopStateEvent) {
      const held = heldEntry(event.state, key);
      if (held !== null) setId(held.id);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [key, paused]);

  const clear = useCallback(() => setId(null), []);
  return { id, clear };
}
