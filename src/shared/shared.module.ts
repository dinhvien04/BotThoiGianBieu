import { Module } from "@nestjs/common";
import { MessageFormatter } from "./utils/message-formatter";
import { DateParser } from "./utils/date-parser";

@Module({
  providers: [MessageFormatter, DateParser],
  exports: [MessageFormatter, DateParser],
})
export class SharedModule {}
