import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { newId } from "@/lib/id";

export async function logAudit(entry: {
  orgId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: newId("audit"),
    orgId: entry.orgId,
    userId: entry.userId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadataJson: entry.metadata ?? {},
  });
}
