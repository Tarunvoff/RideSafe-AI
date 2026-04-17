import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

// Admin-only guard
@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err) {
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admins only');
    }
    return user;
  }
}
