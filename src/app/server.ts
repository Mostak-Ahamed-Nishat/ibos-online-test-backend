import mongoose from "mongoose";
import { env } from "../config/env";
import { connectToDatabase } from "../config/mongodb";
import { app } from "./app";

export const startServer = async (): Promise<void> => {
  await connectToDatabase();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

const shutdown = async (): Promise<void> => {
  await mongoose.connection.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
