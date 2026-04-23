import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const url = config.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('Thiếu biến môi trường DATABASE_URL');
    }

    return {
      type: 'postgres',
      url,
      entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
      synchronize: false,
      ssl: { rejectUnauthorized: false },
      logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
    };
  },
};
