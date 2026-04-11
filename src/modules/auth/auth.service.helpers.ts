import { ApiError } from "../../utils/api-error";
import { auditAuthEvent } from "./auth-audit.service";
import {
  findActiveRefreshToken,
  revokeAllActiveRefreshTokens,
  revokeSingleRefreshToken,
  rotateRefreshToken,
} from "./auth-session.service";
import { UserModel } from "./models";
import type { LogoutAllInput, LogoutInput, RefreshTokenInput } from "./auth.validation";
import type { RequestMeta } from "./auth.util";

type AuthUser = {
  _id: unknown;
  role: "ADMIN" | "CANDIDATE";
  studentId?: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  isEmailVerified: boolean;
};

export async function handleRefreshToken({
  payload,
  requestMeta,
  issueTokenPair,
  accessTokenExpiresInSeconds,
}: {
  payload: RefreshTokenInput;
  requestMeta?: RequestMeta;
  issueTokenPair: (user: AuthUser) => { accessToken: string };
  accessTokenExpiresInSeconds: number;
}) {
  const existingToken = await findActiveRefreshToken(payload.refreshToken);
  if (!existingToken) {
    await auditAuthEvent({
      action: "auth.refresh.failed",
      metadata: { reason: "invalid_or_expired_token" },
      requestMeta,
    });
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await UserModel.findById(existingToken.userId);
  if (!user || user.status !== "ACTIVE") {
    await auditAuthEvent({
      action: "auth.refresh.failed",
      actorUserId: user ? String(user._id) : null,
      metadata: { reason: "user_not_found_or_inactive" },
      requestMeta,
    });
    throw new ApiError(401, "User not found or inactive");
  }

  if (user.role === "CANDIDATE" && !user.isEmailVerified) {
    await auditAuthEvent({
      action: "auth.refresh.failed",
      actorUserId: String(user._id),
      metadata: { reason: "email_not_verified" },
      requestMeta,
    });
    throw new ApiError(403, "Please verify your email before login");
  }

  const { accessToken } = issueTokenPair(user);
  const newRefreshToken = await rotateRefreshToken(String(existingToken._id), String(user._id));

  await auditAuthEvent({
    action: "auth.refresh.success",
    actorUserId: String(user._id),
    requestMeta,
  });

  return {
    message: "Token refreshed successfully",
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer" as const,
      expiresIn: accessTokenExpiresInSeconds,
    },
  };
}

export async function handleLogout(payload: LogoutInput, requestMeta?: RequestMeta) {
  const existingToken = await findActiveRefreshToken(payload.refreshToken);
  if (!existingToken) {
    return { message: "Logout successful" };
  }

  await revokeSingleRefreshToken(String(existingToken._id));
  await auditAuthEvent({
    action: "auth.logout.success",
    actorUserId: String(existingToken.userId),
    requestMeta,
  });

  return { message: "Logout successful" };
}

export async function handleLogoutAll(payload: LogoutAllInput, requestMeta?: RequestMeta) {
  const existingToken = await findActiveRefreshToken(payload.refreshToken);
  if (!existingToken) {
    return { message: "Logout successful from all devices" };
  }

  await revokeAllActiveRefreshTokens(String(existingToken.userId), new Date());
  await auditAuthEvent({
    action: "auth.logout_all.success",
    actorUserId: String(existingToken.userId),
    requestMeta,
  });

  return { message: "Logout successful from all devices" };
}

export async function getCurrentUserPayload(userId: string) {
  const user = await UserModel.findById(userId).lean();
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    id: String(user._id),
    studentId: user.studentId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    status: user.status,
  };
}
