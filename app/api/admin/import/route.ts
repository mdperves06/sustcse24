import { apiRoute, readJson } from "@/lib/api";
import { runImportRequest } from "@/services/student-import";

/** POST /api/admin/import — { csv, dryRun? }. Dry runs only validate; real runs re-validate and create valid rows. */
export const POST = apiRoute(async ({ req, actor }) => runImportRequest(actor, await readJson(req)));
