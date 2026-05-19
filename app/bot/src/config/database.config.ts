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

    const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
    const sslEnabled =
      config.get<string>('DATABASE_SSL') === 'true' ||
      config.get<string>('DATABASE_SSL') === '1' ||
      (nodeEnv === 'production' && config.get<string>('DATABASE_SSL') !== 'false');
    const sslStrict =
      config.get<string>('DATABASE_SSL_STRICT') ?? (nodeEnv === 'production' ? 'true' : 'false');

    return {
      type: 'postgres',
      url,
      entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
      synchronize: false,
      ssl: sslEnabled ? { rejectUnauthorized: sslStrict !== 'false' && sslStrict !== '0' } : false,
      logging: nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
    };
  },
};
