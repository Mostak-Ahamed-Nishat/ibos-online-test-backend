import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/config/mongodb";
import { UserModel } from "../src/modules/auth/models";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const seedAdmin = async (): Promise<void> => {
  const email = getRequiredEnv("ADMIN_SEED_EMAIL").toLowerCase();
  const password = getRequiredEnv("ADMIN_SEED_PASSWORD");
  const fullName = process.env.ADMIN_SEED_FULL_NAME ?? "System Admin";
  const studentId = (process.env.ADMIN_SEED_STUDENT_ID ?? "ADM001").toUpperCase();

  await connectToDatabase();

  const existingByStudentId = await UserModel.findOne({ studentId }).lean();
  if (existingByStudentId && existingByStudentId.email !== email) {
    throw new Error(`Student ID ${studentId} is already used by another account`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        fullName,
        studentId,
        passwordHash,
        role: "ADMIN",
        isEmailVerified: true,
        status: "ACTIVE",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Admin seeded successfully: ${email}`);
};

seedAdmin()
  .catch((error: unknown) => {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
