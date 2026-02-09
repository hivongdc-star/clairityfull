import type { FastifyRequest } from "fastify";
import { unauthorized } from "../util/errors.js";
import { verifyAccessToken } from "../util/jwt.js";

export type AuthUser = {
  id: string;
  email: string;
};

export const requireAuth = async (req: FastifyRequest): Promise<AuthUser> => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw unauthorized("Thiếu token đăng nhập.");
  }

  const token = header.slice("bearer ".length).trim();
  if (!token) throw unauthorized("Thiếu token đăng nhập.");

  const payload = verifyAccessToken(token);
  const user = { id: payload.sub, email: payload.email } satisfies AuthUser;

  // attach for convenience
  (req as any).user = user;
  return user;
};
