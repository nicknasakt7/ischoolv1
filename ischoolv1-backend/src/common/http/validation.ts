import { HttpStatus, StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { ErrorCode } from '@ischool/contracts';
import { AppException } from './app-exception.js';

/** Groups Standard Schema issues by dotted field path ("" for the root). */
export function issuesToFieldErrors(
  issues: readonly StandardSchemaV1.Issue[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const field = (issue.path ?? [])
      .map((segment) =>
        typeof segment === 'object' ? String(segment.key) : String(segment),
      )
      .join('.');
    (errors[field] ??= []).push(issue.message);
  }
  return errors;
}

/** Validates every `@Body({ schema })`, `@Query({ schema })` and `@Param({ schema })`. */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'The request did not pass validation.',
        issuesToFieldErrors(issues),
      ),
  });
}
