import "server-only";
import { randomBytes } from "node:crypto";
import { storage } from "@/lib/storage";
import { ValidationError } from "@/lib/errors";

type Detected = { mime: string; ext: string };

const OFFICE_BY_EXT: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};
const OLE_BY_EXT: Record<string, string> = {
  doc: "application/msword",
  ppt: "application/vnd.ms-powerpoint",
  xls: "application/vnd.ms-excel",
};

const startsWith = (buf: Uint8Array, sig: number[], offset = 0) =>
  sig.every((b, i) => buf[offset + i] === b);

/**
 * Detects the real file type from its magic bytes. The browser-supplied MIME type
 * and extension are never trusted on their own (SVG/HTML are never accepted).
 */
export function sniffFileType(buf: Uint8Array, fileName: string): Detected | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return { mime: "image/gif", ext: "gif" };
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8))
    return { mime: "image/webp", ext: "webp" };
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" };
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    const e = ext in OFFICE_BY_EXT ? ext : "zip";
    return { mime: OFFICE_BY_EXT[e]!, ext: e };
  }
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && ext in OLE_BY_EXT)
    return { mime: OLE_BY_EXT[ext]!, ext };
  return null;
}

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
const DOCS = [
  "application/pdf",
  ...Object.values(OFFICE_BY_EXT),
  ...Object.values(OLE_BY_EXT),
];

const MB = 1024 * 1024;

export const UPLOAD_RULES = {
  avatar: { maxBytes: 2 * MB, types: IMAGES, label: "JPG, PNG or WebP up to 2 MB" },
  cover: { maxBytes: 4 * MB, types: IMAGES, label: "JPG, PNG or WebP up to 4 MB" },
  postImage: { maxBytes: 5 * MB, types: [...IMAGES, "image/gif"], label: "Images up to 5 MB" },
  screenshot: { maxBytes: 5 * MB, types: IMAGES, label: "JPG, PNG or WebP up to 5 MB" },
  cv: { maxBytes: 5 * MB, types: ["application/pdf"], label: "PDF up to 5 MB" },
  attachment: { maxBytes: 10 * MB, types: [...IMAGES, ...DOCS], label: "PDF, Office or image up to 10 MB" },
  resource: { maxBytes: 25 * MB, types: [...IMAGES, ...DOCS], label: "PDF, Office, ZIP or image up to 25 MB" },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;

export type SavedUpload = { key: string; mime: string; size: number; fileName: string };

/** Keeps a readable, harmless file name for Content-Disposition. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "file";
}

/** Validates size + real type, then stores the file under a random key. */
export async function saveUpload(file: File, kind: UploadKind, field = "file"): Promise<SavedUpload> {
  const rule = UPLOAD_RULES[kind];
  if (file.size > rule.maxBytes) {
    throw new ValidationError(`File is too large (${rule.label}).`, { [field]: [`Maximum size: ${rule.label}.`] });
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const detected = sniffFileType(buf, file.name);
  if (!detected || !(rule.types as readonly string[]).includes(detected.mime)) {
    throw new ValidationError("This file type isn't allowed.", { [field]: [`Allowed: ${rule.label}.`] });
  }
  const year = new Date().getUTCFullYear();
  const key = `${kind}/${year}/${randomBytes(16).toString("hex")}.${detected.ext}`;
  await storage().put(key, buf, detected.mime);
  return { key, mime: detected.mime, size: buf.byteLength, fileName: sanitizeFileName(file.name) };
}

export async function deleteUpload(key: string | null | undefined) {
  if (!key) return;
  try {
    await storage().delete(key);
  } catch (error) {
    console.error("[uploads] failed to delete", key, error);
  }
}
