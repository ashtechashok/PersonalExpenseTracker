import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-accent) 12%, transparent), transparent 70%)",
        }}
      />
      <SignupForm />
    </div>
  );
}
