import { AuditLogModel } from "../modules/audit/models/audit-log.model";

interface LogAuthEventInput {
  action: string;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const logAuthEvent = async ({
  action,
  actorUserId = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
}: LogAuthEventInput): Promise<void> => {
  try {
    await AuditLogModel.create({
      actorUserId,
      action,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Audit log write failed:", error);
    }
  }
};

