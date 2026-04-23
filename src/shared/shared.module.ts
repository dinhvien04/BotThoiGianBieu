import { Module } from '@nestjs/common';
import { MessageFormatter } from './utils/message-formatter';

@Module({
  providers: [MessageFormatter],
  exports: [MessageFormatter],
})
export class SharedModule {}
