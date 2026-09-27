import type { Metadata } from "next";
import { Bot, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { isAssistantConfigured } from "@/services/assistant";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  const user = await requireUser();
  const configured = isAssistantConfigured();
  const enabled = await getSetting("aiAssistantEnabled");

  return (
    <>
      <PageHeader
        title="AI Batch Assistant"
        description="Ask about batchmates' skills, upcoming events, opportunities and teammates."
      />
      <p className="mb-4 flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        The assistant only sees what you could see yourself — it uses the same privacy-filtered data as the directory
        and never has access to private fields like hidden phone numbers or emails.
      </p>
      {!configured ? (
        <EmptyState
          icon={Bot}
          title="Assistant not configured"
          description="An administrator needs to set ANTHROPIC_API_KEY on the server to enable the AI assistant."
        />
      ) : !enabled ? (
        <EmptyState icon={Bot} title="Assistant turned off" description="An admin has disabled the AI assistant for now." />
      ) : (
        <AssistantChat firstName={user.fullName.split(" ")[0] ?? user.fullName} />
      )}
    </>
  );
}
