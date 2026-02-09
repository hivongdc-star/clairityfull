import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export const healthRoutes = async (app: FastifyInstance) => {
  app.get("/health/live", async () => {
    return { live: true };
  });

  app.get("/health/ready", async () => {
    try {
      await pool.query("select 1 as ok");
      return { ready: true, db: true };
    } catch {
      return { ready: false, db: false };
    }
  });
};
