import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { env } from "../../config/env";

export interface AuthUserPayload {
  sub: string;
  role: "ADMIN" | "CANDIDATE";
  studentId?: string;
  email: string;
}

export const issueAccessToken = (payload: AuthUserPayload): string => {
  return jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn as StringValue,
  });
};

export const verifyAccessToken = (token: string): AuthUserPayload => {
  return jwt.verify(token, env.accessTokenSecret) as AuthUserPayload;
};
