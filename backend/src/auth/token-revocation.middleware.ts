import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisStateService } from '../state/redis-state.service';

/**
 * TokenRevocationMiddleware: Intercepts all requests to verify if the 
 * provided JWT is present in the Redis global revocation list.
 * 
 * Performance: Optimized for <5ms using Redis sIsMember (EXISTS check).
 */
@Injectable()
export class TokenRevocationMiddleware implements NestMiddleware {
  constructor(private readonly redisState: RedisStateService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Let JwtAuthGuard handle missing tokens downstream
    }

    const token = authHeader.split(' ')[1];

    // Global Revocation List Check
    const isRevoked = await this.redisState.isTokenRevoked(token);
    
    if (isRevoked) {
      throw new UnauthorizedException('Token has been revoked by the global security administrator');
    }

    next();
  }
}
