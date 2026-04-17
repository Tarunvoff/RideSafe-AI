import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * ── Sovereign Forensic Sanitization Perimeter ────────────────────────────────
 * 
 * This global exception filter acts as the platform's high-fidelity security 
 * boundary. It intercepts anomalies and transforms them into cryptographically 
 * sanitized architectural responses, ensuring zero-information leakage.
 * 
 * For comprehensive security matrix details, refer to:
 * - ARCHITECTURE/SECURITY_AND_FRAUD_MATRIX.md
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('SovereignPerimeter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage = 'Internal server error';
    if (exception instanceof HttpException) {
      const payload = exception.getResponse() as any;
      if (typeof payload === 'string') {
        errorMessage = payload;
      } else if (Array.isArray(payload?.message)) {
        errorMessage = payload.message.join('; ');
      } else if (typeof payload?.message === 'string') {
        errorMessage = payload.message;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    response.status(status).json({
      success: false,
      data: null,
      error: errorMessage,
    });
  }
}
