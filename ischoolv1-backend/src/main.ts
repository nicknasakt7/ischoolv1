import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { AppConfigService } from './config/app-config.service.js';

const app = await NestFactory.create(AppModule, { bufferLogs: true });
setupApp(app);
await app.listen(app.get(AppConfigService).get('PORT'));
