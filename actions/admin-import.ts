"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { importStudents, previewImport, type ImportPreview } from "@/services/student-import";
import type { ImportSummary } from "@/lib/csv";

export async function previewImportAction(csv: string): Promise<ActionResult<ImportPreview>> {
  return runAction(async () => {
    const actor = await getActor();
    return previewImport(actor, String(csv ?? ""));
  });
}

export async function importStudentsAction(csv: string): Promise<ActionResult<ImportSummary>> {
  return runAction(async () => {
    const actor = await getActor();
    const summary = await importStudents(actor, String(csv ?? ""));
    revalidatePath("/admin/students");
    revalidatePath("/admin");
    revalidatePath("/directory");
    return summary;
  });
}
