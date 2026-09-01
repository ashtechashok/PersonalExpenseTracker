import NavBar from "@/components/NavBar";
import { PageTransition } from "@/components/PageTransition";
import { requireSession } from "@/lib/session";
import { SettingsProvider } from "@/lib/settings-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <SettingsProvider settings={{ currency: session.currency, locale: session.locale }}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <NavBar email={session.email} isAdmin={session.isAdmin} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
