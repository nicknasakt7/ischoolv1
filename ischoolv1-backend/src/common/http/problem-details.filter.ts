import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCode, type Problem } from '@ischool/contracts';
import { AppException } from './app-exception.js';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_FAILED,
};

/** Turns every thrown error into an RFC 9457 `application/problem+json` response. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const problem = this.toProblem(exception, request.originalUrl);
    if (problem.status >= 500) {
      this.logger.error(exception);
    }

    response
      .status(problem.status)
      .type('application/problem+json')
      .json(problem);
  }

  private toProblem(exception: unknown, instance: string): Problem {
    if (exception instanceof AppException) {
      return this.build(exception.getStatus(), exception.code, instance, {
        detail: exception.detail,
        errors: exception.errors,
      });
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return this.build(
        status,
        CODE_BY_STATUS[status] ?? ErrorCode.INTERNAL,
        instance,
        { detail: exception.message },
      );
    }
    // Never leak internals of unexpected errors to the client.
    return this.build(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL,
      instance,
    );
  }

  private build(
    status: number,
    code: string,
    instance: string,
    extra: Pick<Problem, 'detail' | 'errors'> = {},
  ): Problem {
    return {
      type: 'about:blank',
      title: HttpStatus[status]?.replaceAll('_', ' ') ?? 'Error',
      status,
      code,
      instance,
      ...(extra.detail !== undefined && { detail: extra.detail }),
      ...(extra.errors !== undefined && { errors: extra.errors }),
    };
  }
}
