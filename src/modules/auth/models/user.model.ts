import { model, Schema, type InferSchemaType } from "mongoose";

export const USER_ROLES = ["ADMIN", "CANDIDATE"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;

const userSchema = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      match: /^[A-Z0-9]{6}$/,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "CANDIDATE",
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
