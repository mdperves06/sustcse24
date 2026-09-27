import { apiRoute } from "@/lib/api";
import { recordResourceDownload } from "@/services/resources";

/** GET /api/resources/:id/download — counts the download, then redirects (302) to the file or external link. */
export const GET = apiRoute<{ id: string }>(async ({ params }) => {
  const target = await recordResourceDownload(params.id);
  // Relative Location for our own file route keeps the redirect correct behind proxies.
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
});
