import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigService } from '../config/app-config.service.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          // Reuse the caller's request id when a proxy sets one, so logs line up end to end.
          genReqId: (request, response) => {
            const id = request.headers['x-request-id'] ?? randomUUID();
            response.setHeader('x-request-id', id);
            return id;
          },
          // Log what identifies a request, never headers (cookies, tokens) or bodies (student data).
          serializers: {
            req: (request: { id: string; method: string; url: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url,
            }),
            res: (response: { statusCode: number }) => ({
              statusCode: response.statusCode,
            }),
          },
          transport:
            config.get('APP_ENV') === 'local'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
})
export class LoggingModule {}
