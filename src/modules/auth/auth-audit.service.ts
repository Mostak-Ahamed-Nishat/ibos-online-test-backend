import { logAuthEvent } from "../../services/audit-log.service";
import type { RequestMeta } from "./auth.util";
import { normalizeRequestMeta } from "./auth.util";

interface AuditAuthEventInput {
  action: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  requestMeta?: RequestMeta;
}

export const auditAuthEvent = async ({
  action,
  actorUserId,
  metadata,
  requestMeta,
}: AuditAuthEventInput): Promise<void> => {
  const normalizedMeta = normalizeRequestMeta(requestMeta);

  await logAuthEvent({
    action,
    actorUserId,
    ...normalizedMeta,
    metadata: metadata ?? null,
  });
};
