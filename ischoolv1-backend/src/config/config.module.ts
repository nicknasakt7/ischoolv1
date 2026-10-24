import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service.js';
import { validateEnv } from './env.schema.js';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      validate: validateEnv,
      // Tests and CI pass variables explicitly.
      ignoreEnvFile: process.env.APP_ENV === 'test',
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
