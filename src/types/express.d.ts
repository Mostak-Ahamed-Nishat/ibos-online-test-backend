import type { AuthUserPayload } from "../modules/auth/auth.token";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export {};
