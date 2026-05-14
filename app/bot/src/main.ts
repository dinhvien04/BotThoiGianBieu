import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });
  const config = app.get(ConfigService);
  const port = Number(config.get<string>("PORT") || "3001");
  const corsOrigins = (
    config.get<string>("CORS_ORIGIN") ||
    config.get<string>("WEB_APP_URL") ||
    "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Nhan tin hieu ${signal}, dang tat backend...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen(port);
  logger.log(`Bot/API da khoi dong tai http://localhost:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Bootstrap that bai:", err);
  process.exit(1);
});
