import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import { canSee, DEFAULT_PRIVACY } from "@/lib/privacy";

const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

/**
 * Serves uploaded files to signed-in batch members only. CVs additionally respect
 * the owner's privacy setting. Files are never served from /public.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { key: parts } = await params;
  const key = parts.join("/");
  if (!/^[a-zA-Z]+\/\d{4}\/[a-f0-9]{32}\.[a-z0-9]{2,5}$/.test(key)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let downloadName: string | null = null;
  if (key.startsWith("cv/")) {
    const owner = await db.studentProfile.findFirst({
      where: { cvKey: key },
      select: { userId: true, cvFileName: true, user: { select: { privacy: { select: { cvVisibility: true } } } } },
    });
    if (!owner) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const visibility = owner.user.privacy?.cvVisibility ?? DEFAULT_PRIVACY.cvVisibility;
    if (!canSee(visibility, user, owner.userId)) return NextResponse.json({ error: "Not found." }, { status: 404 });
    downloadName = owner.cvFileName;
  } else if (key.startsWith("resource/")) {
    const resource = await db.resource.findFirst({ where: { fileKey: key, deletedAt: null }, select: { fileName: true } });
    if (!resource) return NextResponse.json({ error: "Not found." }, { status: 404 });
    downloadName = resource.fileName;
  } else if (key.startsWith("attachment/")) {
    const a = await db.announcement.findFirst({ where: { attachmentKey: key, deletedAt: null }, select: { attachmentName: true } });
    if (!a) return NextResponse.json({ error: "Not found." }, { status: 404 });
    downloadName = a.attachmentName;
  }

  const object = await storage().get(key);
  if (!object) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const forceDownload = req.nextUrl.searchParams.get("download") === "1" || !INLINE_TYPES.has(object.contentType);
  const safeName = (downloadName ?? key.split("/").pop() ?? "file").replace(/[^\w.\- ]/g, "_");

  return new NextResponse(object.body as BodyInit, {
    headers: {
      "Content-Type": object.contentType,
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
