import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { env } from "../../config/env";

interface AccessTokenPayload {
  sub: string;
  role: "ADMIN" | "CANDIDATE";
  studentId?: string;
  email: string;
}

export const issueAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn as StringValue,
  });
};
