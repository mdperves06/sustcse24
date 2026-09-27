"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import { restrictReportedAuthor, reviewReport } from "@/services/moderation";
import type { ReportDecision } from "@/lib/validation/admin";

const MESSAGES: Record<ReportDecision["decision"], string> = {
  remove: "Content removed and report resolved.",
  resolve: "Report resolved.",
  dismiss: "Report dismissed.",
};

export async function decideReportAction(
  id: string,
  input: { decision: ReportDecision["decision"]; note?: string },
): Promise<ActionResult> {
  const decision = typeof input?.decision === "string" && input.decision in MESSAGES ? input.decision : null;
  return runAction(
    async () => {
      const actor = await getActor();
      const { postId } = await reviewReport(actor, id, input);
      revalidatePath("/admin/moderation");
      revalidatePath("/admin");
      revalidatePath("/feed");
      if (postId) revalidatePath(`/feed/${postId}`);
    },
    decision ? MESSAGES[decision] : "Report updated.",
  );
}

export async function restrictAuthorAction(reportId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await restrictReportedAuthor(actor, reportId, formToObject(formData));
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/students");
  }, "Author restricted from posting.");
}
