import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { AppConfigService } from './config/app-config.service.js';

// Better Auth reads raw request bodies on /auth; its Nest adapter re-adds parsers elsewhere.
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
  bodyParser: false,
});
setupApp(app);
await app.listen(app.get(AppConfigService).get('PORT'));
