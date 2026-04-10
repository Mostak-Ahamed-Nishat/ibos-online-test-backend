import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name must be at most 120 characters"),
  email: z.email("Invalid email address").transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailQuerySchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailQueryInput = z.infer<typeof verifyEmailQuerySchema>;
