import { model, Schema, type InferSchemaType, Types } from "mongoose";

const refreshTokenSchema = new Schema(
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
    deviceInfo: {
      type: String,
      default: null,
      maxlength: 300,
    },
    ipAddress: {
      type: String,
      default: null,
      maxlength: 64,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 400,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    replacedByTokenId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "RefreshToken",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

refreshTokenSchema.index({ userId: 1, expiresAt: -1 });

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema> & {
  userId: Types.ObjectId;
};

export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema);
