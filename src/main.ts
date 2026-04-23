import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Nhận tín hiệu ${signal}, đang tắt bot...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  logger.log("🤖 Bot Thời Gian Biểu đã khởi động");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Bootstrap thất bại:", err);
  process.exit(1);
});
