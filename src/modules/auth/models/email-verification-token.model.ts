import { model, Schema, type InferSchemaType, Types } from "mongoose";

const emailVerificationTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

emailVerificationTokenSchema.index({ userId: 1, createdAt: -1 });

export type EmailVerificationTokenDocument = InferSchemaType<
  typeof emailVerificationTokenSchema
> & {
  userId: Types.ObjectId;
};

export const EmailVerificationTokenModel = model(
  "EmailVerificationToken",
  emailVerificationTokenSchema,
);
