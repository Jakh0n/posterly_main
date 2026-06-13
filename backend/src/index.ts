import { createApp } from "./app";
import { env } from "./lib/env";
import { logger } from "./utils/logger";

function bootstrap(): void {
  try {
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`Posterly API listening on port ${env.PORT}`, {
        env: env.NODE_ENV,
      });
    });

    const shutdown = (signal: NodeJS.Signals): void => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    logger.error("Failed to start server", {
      message: err instanceof Error ? err.message : "unknown error",
    });
    process.exit(1);
  }
}

bootstrap();
