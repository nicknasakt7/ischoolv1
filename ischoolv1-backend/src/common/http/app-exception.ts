import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@ischool/contracts';

/**
 * Throw this from application code. `code` is the stable identifier the frontend
 * translates; `detail` is an English explanation for developers and logs.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode | (string & {}),
    status: HttpStatus,
    readonly detail?: string,
    readonly errors?: Record<string, string[]>,
  ) {
    super(detail ?? code, status);
  }
}
