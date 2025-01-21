import { NextFunction, Request, Response } from 'express';
import { jwtService } from '@services/utils/jwt.services';
import { adminService } from '@services/db/admin.service';
import { ServerError } from 'error-express';

export type Role = 'admin' | 'student' | 'teacher' | 'moderator';

export function auth(...roles: Role[]): MethodDecorator {
  return (target, key, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const [req, res, next] = args as [Request, Response, NextFunction];
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

      if (!token) {
        throw new ServerError('Unauthorized: No token provided', 401);
      }

      const tokenValue = jwtService.verifyToken(token) as { userId: string };
      if (!tokenValue) {
        throw new ServerError('invalid token', 401);
      }

      const user = await adminService.getUserById(tokenValue.userId);
      if (!user) {
        throw new ServerError('invalid user', 404);
      }

      req.user = user;

      if (roles.length > 0 && !roles.includes(user.role)) {
        throw new ServerError('Forbidden: Insufficient permissions', 403); // Use 403 for forbidden access
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
