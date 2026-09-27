import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan } from "@/lib/auth/permissions";
import { getClientIp } from "@/lib/request-context";
import { appDayStart } from "@/lib/time";
import { auditFiltersSchema, type AuditFilters } from "@/lib/validation/admin";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";

export const AUDIT_PAGE_SIZE = 30;

/** Records a staff action with the caller's IP. Never pass passwords or tokens in metadata. */
export async function recordAudit(
  actor: Viewer,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  let ipAddress: string | null = null;
  try {
    ipAddress = (await getClientIp()).slice(0, 64);
  } catch {
    ipAddress = null; // outside a request (should not happen for staff actions)
  }
  await audit({ actorId: actor.id, action, entityType, entityId, metadata, ipAddress });
}

function dayBoundary(value: string, endOfDay: boolean): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const start = appDayStart(y, m, d);
  return endOfDay ? new Date(start.getTime() + 86_400_000) : start;
}

export async function listAuditLogs(actor: Viewer, input: unknown) {
  assertCan(actor, "audit.view");
  const filters: AuditFilters = auditFiltersSchema.parse(input);

  const and: Prisma.AuditLogWhereInput[] = [];
  if (filters.action) and.push({ action: { startsWith: filters.action, mode: "insensitive" } });
  if (filters.entity) and.push({ entityType: { equals: filters.entity, mode: "insensitive" } });
  if (filters.entityId) and.push({ entityId: filters.entityId });
  if (filters.actor) and.push({ actor: { is: { roll: { equals: filters.actor, mode: "insensitive" } } } });
  if (filters.from) and.push({ createdAt: { gte: dayBoundary(filters.from, false) } });
  if (filters.to) and.push({ createdAt: { lt: dayBoundary(filters.to, true) } });
  const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};

  const [total, rows, entityTypes] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
        actor: { select: { id: true, roll: true, profile: { select: { fullName: true } } } },
      },
    }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);

  return {
    filters,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    entityTypes: entityTypes.map((e) => e.entityType),
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
      actor: r.actor ? { id: r.actor.id, roll: r.actor.roll, name: r.actor.profile?.fullName ?? r.actor.roll } : null,
    })),
  };
}
