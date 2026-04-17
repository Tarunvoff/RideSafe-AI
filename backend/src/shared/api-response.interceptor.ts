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
