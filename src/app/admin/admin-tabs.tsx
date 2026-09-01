"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

// Carried by tab navigations only, so the panel cross-fades when the tab
// changes and not when anything else on an admin page moves.
export const ADMIN_TAB_TRANSITION_TYPE = "admin-tab";

export type AdminTabLabels = {
  tabPhotos: string;
  tabGuests: string;
  tabBin: string;
};

type Href = "/admin" | "/admin/guests" | "/admin/bin";

function activeHref(pathname: string): Href {
  if (pathname.startsWith("/admin/guests")) return "/admin/guests";
  if (pathname.startsWith("/admin/bin")) return "/admin/bin";
  return "/admin";
}

// The pill follows the address rather than a prop: a tab navigation renders
// the enclosing loading skeleton in between, and that skeleton has to put the
// pill on the tab being opened instead of on its own.
// `binCount` is unknown until the bin page loads; until then its label reads
// without a number.
export function AdminTabs({
  binCount,
  labels,
}: {
  binCount?: number;
  labels: AdminTabLabels;
}) {
  const active = activeHref(usePathname());
  const tabs: { href: Href; label: string }[] = [
    { href: "/admin", label: labels.tabPhotos },
    { href: "/admin/guests", label: labels.tabGuests },
    {
      href: "/admin/bin",
      label: binCount ? `${labels.tabBin} ${binCount}` : labels.tabBin,
    },
  ];

  return (
    <nav className="mx-4 mb-4 flex gap-1 rounded-pill bg-sand-deep p-1 text-[13px]">
      {tabs.map((tab) =>
        tab.href === active ? (
          <ViewTransition
            key={tab.href}
            name="admin-tab-pill"
            share="admin-tab-pill"
            default="none"
          >
            <span
              aria-current="page"
              className="flex-1 rounded-pill bg-card py-2.5 text-center text-gold-small"
            >
              {tab.label}
            </span>
          </ViewTransition>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            transitionTypes={[ADMIN_TAB_TRANSITION_TYPE]}
            className="flex-1 rounded-pill py-2.5 text-center text-ink-muted transition hover:text-ink active:text-ink"
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}
