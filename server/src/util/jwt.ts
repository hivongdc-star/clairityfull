import jwt from "jsonwebtoken";
import { env } from "../env.js";

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.jwtAccessSecret, {
    algorithm: "HS256",
    expiresIn: env.accessTokenTtlSeconds
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.jwtAccessSecret, {
    algorithms: ["HS256"]
  });

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const sub = (decoded as any).sub;
  const email = (decoded as any).email;

  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Invalid token payload fields");
  }

  return { sub, email };
};
