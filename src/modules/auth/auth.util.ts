import crypto from "node:crypto";
import { ApiError } from "../../utils/api-error";
import { UserModel } from "./models";

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export const normalizeRequestMeta = (meta?: RequestMeta) => ({
  ipAddress: meta?.ipAddress ?? null,
  userAgent: meta?.userAgent ?? null,
});

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateUniqueStudentId = async (): Promise<string> => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    let generated = "";
    for (let i = 0; i < 6; i += 1) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }

    const exists = await UserModel.exists({ studentId: generated });
    if (!exists) {
      return generated;
    }
  }

  throw new ApiError(500, "Could not generate unique student id");
};
