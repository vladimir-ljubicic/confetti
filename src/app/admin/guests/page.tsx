import { redirect } from "next/navigation";
import { loadAdminSummary, type AdminPhotoCounts } from "@/lib/admin-gallery";
import { isAdmin } from "@/lib/admin-session";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { AdminChrome, adminChromeLabels } from "../admin-chrome";
import { GuestRow } from "./guest-row";

export const dynamic = "force-dynamic";

export default async function AdminGuestsPage() {
  if (!(await isAdmin())) redirect("/admin");

  const [locale, dict, summary] = await Promise.all([
    getLocale(),
    getDict(),
    loadAdminSummary(),
  ]);
  const labels = dict.admin;
  const guestCount = summary.uploaders.length + (summary.unnamed ? 1 : 0);

  const countsLine = ({ photoCount, privateCount }: AdminPhotoCounts) => {
    const total = pluralize(locale, photoCount, {
      one: labels.photosOne,
      few: labels.photosFew,
      many: labels.photosMany,
    });
    if (privateCount === 0) return total;
    return `${total} · ${pluralize(locale, privateCount, {
      one: labels.privateOne,
      few: labels.privateFew,
      many: labels.privateMany,
    })}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminChrome
        locale={locale}
        binCount={summary.binCount}
        title={pluralize(locale, guestCount, {
          one: labels.guestsOne,
          few: labels.guestsFew,
          many: labels.guestsMany,
        })}
        sub={labels.guestsSub}
        labels={adminChromeLabels(dict)}
      />

      {guestCount === 0 ? (
        <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 px-3.5 pb-8">
          {summary.uploaders.map((uploader) => (
            <GuestRow
              key={uploader.publicId}
              publicId={uploader.publicId}
              name={uploader.displayName}
              countsLine={countsLine(uploader)}
              labels={{
                rename: labels.rename,
                renameSave: labels.renameSave,
                renameCancel: labels.renameCancel,
                actionFailed: labels.actionFailed,
              }}
            />
          ))}
          {summary.unnamed && (
            <li className="flex items-center justify-between gap-3 rounded-card bg-card px-3.5 py-3">
              <span className="text-[15px] text-ink">{labels.unknownUploader}</span>
              <span className="text-meta whitespace-nowrap text-ink/55">
                {countsLine(summary.unnamed)}
              </span>
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
