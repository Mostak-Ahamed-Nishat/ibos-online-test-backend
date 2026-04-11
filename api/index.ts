import { app } from "../src/app/app";
import { connectToDatabase } from "../src/config/mongodb";

let dbConnectionPromise: Promise<void> | null = null;

const ensureDatabaseConnection = async (): Promise<void> => {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectToDatabase();
  }

  await dbConnectionPromise;
};

export default async function handler(req: unknown, res: unknown): Promise<void> {
  await ensureDatabaseConnection();
  (app as unknown as (request: unknown, response: unknown) => void)(req, res);
}
