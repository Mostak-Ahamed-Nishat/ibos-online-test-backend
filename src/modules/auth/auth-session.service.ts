import crypto from "node:crypto";
import { env } from "../../config/env";
import { RefreshTokenModel } from "./models";
import { hashToken } from "./auth.util";

export const createRefreshToken = async (userId: string): Promise<string> => {
  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    userId,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt,
    revokedAt: null,
  });

  return rawRefreshToken;
};

export const findActiveRefreshToken = async (rawRefreshToken: string) => {
  return RefreshTokenModel.findOne({
    tokenHash: hashToken(rawRefreshToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

export const revokeAllActiveRefreshTokens = async (userId: string, revokedAt: Date): Promise<void> => {
  await RefreshTokenModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt } },
  );
};

export const rotateRefreshToken = async (
  existingTokenId: string,
  userId: string,
): Promise<string> => {
  const newRefreshToken = await createRefreshToken(userId);
  const newTokenDoc = await RefreshTokenModel.findOne({ tokenHash: hashToken(newRefreshToken) });

  await RefreshTokenModel.updateOne(
    { _id: existingTokenId },
    { $set: { revokedAt: new Date(), replacedByTokenId: newTokenDoc?._id ?? null } },
  );

  return newRefreshToken;
};

export const revokeSingleRefreshToken = async (tokenId: string): Promise<void> => {
  await RefreshTokenModel.updateOne({ _id: tokenId }, { $set: { revokedAt: new Date() } });
};
