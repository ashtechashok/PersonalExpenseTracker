import { requirePendingOrRejected } from "@/lib/session";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { ClockIcon, AlertCircleIcon } from "@/components/ui/icons";

export default async function PendingPage() {
  const user = await requirePendingOrRejected();
  const isRejected = user.status === "REJECTED";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-accent) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="w-full max-w-sm animate-slide-up space-y-5 rounded-2xl border border-subtle bg-surface p-7 text-center shadow-elevated">
        <div
          className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${
            isRejected ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300"
          }`}
        >
          {isRejected ? <AlertCircleIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-primary">
            {isRejected ? "Account request declined" : "Awaiting approval"}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {isRejected
              ? "An admin declined this account request. Contact the site admin if you think this is a mistake."
              : "An admin needs to approve your account before you can sign in. Check back soon."}
          </p>
          <p className="mt-2 text-xs text-tertiary">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" className="w-full">
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
