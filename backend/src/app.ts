import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware";
import { apiRouter } from "./routes";

/**
 * Builds and configures the Express application.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/v1", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
