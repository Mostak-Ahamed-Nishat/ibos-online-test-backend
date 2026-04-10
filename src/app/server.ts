import mongoose from "mongoose";
import type { Server } from "node:http";
import { env } from "../config/env";
import { connectToDatabase } from "../config/mongodb";
import { app } from "./app";

let httpServer: Server;

export const startServer = async (): Promise<void> => {
  await connectToDatabase();
  httpServer = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

const shutdown = async (exitCode: number): Promise<void> => {
  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await mongoose.connection.close();
  process.exit(exitCode);
};

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  void shutdown(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled Rejection:", reason);
  void shutdown(1);
});
