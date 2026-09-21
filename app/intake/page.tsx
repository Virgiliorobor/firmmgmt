import { AuthenticatedShell } from "@/app/authenticated-shell";
import { EmptyState } from "@/modules/web-app/ui";

export default function IntakePage() {
  return (
    <AuthenticatedShell pathname="/intake">
      <h1 className="font-serif text-page mb-6">Intake</h1>
      <EmptyState>
        No intake needs attention. Forward client email from Outlook to the dedicated intake address. Capture is not
        part of this first version.
      </EmptyState>
    </AuthenticatedShell>
  );
}
