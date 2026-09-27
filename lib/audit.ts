import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

/** Records privileged actions. Never include passwords or tokens in metadata. */
export async function audit(entry: AuditEntry) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress ?? null,
    },
  });
}
