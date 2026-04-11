import { app } from "../src/app/app";
import { connectToDatabase } from "../src/config/mongodb";

let dbConnectionPromise: Promise<void> | null = null;

const ensureDatabaseConnection = async (): Promise<void> => {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectToDatabase();
  }

  await dbConnectionPromise;
};

const toPathValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join("/");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

const rewriteUrlForExpress = (req: unknown): void => {
  const request = req as {
    url?: string;
    query?: Record<string, unknown>;
  };

  const pathValue = toPathValue(request.query?.path).replace(/^\/+/, "");
  if (!pathValue) {
    return;
  }

  const query = request.query ?? {};
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (key === "path" || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        params.append(key, String(item));
      });
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  request.url = `/api/${pathValue}${queryString ? `?${queryString}` : ""}`;
};

export default async function handler(req: unknown, res: unknown): Promise<void> {
  await ensureDatabaseConnection();
  rewriteUrlForExpress(req);
  (app as unknown as (request: unknown, response: unknown) => void)(req, res);
}
