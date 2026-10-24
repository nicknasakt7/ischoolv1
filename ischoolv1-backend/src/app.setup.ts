import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ProblemDetailsFilter } from './common/http/problem-details.filter.js';
import { createValidationPipe } from './common/http/validation.js';
import { AppConfigService } from './config/app-config.service.js';

/** Everything applied to the app outside the module graph. Shared by main.ts and tests. */
export function setupApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGINS'), credentials: true });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();

  if (config.get('APP_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('iSchool API').setVersion('1').build(),
    );
    SwaggerModule.setup('docs', app, document);
  }
}
