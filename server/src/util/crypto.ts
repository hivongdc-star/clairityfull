import crypto from "node:crypto";

export const newId = (): string => crypto.randomUUID();

export const newRefreshToken = (): string => crypto.randomBytes(32).toString("base64url");

export const sha256Hex = (input: string): string =>
  crypto.createHash("sha256").update(input).digest("hex");
