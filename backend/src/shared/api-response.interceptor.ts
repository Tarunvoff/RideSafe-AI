import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

type StandardResponse<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

/**
 * ── Architectural Response Normalization Layer ────────────────────────────────
 * 
 * Ensures a deterministic, high-fidelity contract for all outgoing data. 
 * envelopes payloads in a standard production-ready schema for consumption 
 * by the elite mobile and dashboard clients.
 * 
 * For UI design system integration, refer to:
 * - ARCHITECTURE/FRONTEND_DESIGN_SYSTEM.md
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data: any) => {
        if (
          data &&
          typeof data === 'object' &&
          Object.prototype.hasOwnProperty.call(data, 'success') &&
          Object.prototype.hasOwnProperty.call(data, 'data') &&
          Object.prototype.hasOwnProperty.call(data, 'error')
        ) {
          return data as StandardResponse<T>;
        }

        return {
          success: true,
          data: data ?? null,
          error: null,
        } as StandardResponse<T>;
      }),
    );
  }
}
