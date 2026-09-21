import { AppShell } from "@/modules/web-app/app-shell";
import { SignInForm } from "@/modules/web-app/sign-in-form";

export default function SignInPage() {
  return (
    <AppShell role={null} pathname="/sign-in">
      <h1 className="font-serif text-page mb-6">Sign in</h1>
      <SignInForm />
    </AppShell>
  );
}
