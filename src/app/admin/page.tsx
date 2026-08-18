import Link from "next/link";
import { isAdmin } from "@/lib/admin-session";
import { getDict } from "@/lib/locale";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const dict = await getDict();
  const labels = dict.admin;
  const admin = await isAdmin();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-serif text-4xl text-gold-deep">{labels.title}</h1>
        <Link href="/" className="text-sm text-ink/60 transition hover:text-ink">
          ← {labels.backToGallery}
        </Link>
      </header>

      {admin ? <p className="text-ink/70">{labels.signedIn}</p> : <AdminLoginForm labels={labels} />}
    </main>
  );
}
