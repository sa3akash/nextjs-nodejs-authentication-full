import { NextFunction, Request, Response } from 'express';
import { ServerError } from 'error-express';
import passport from '@root/passport';
import { IUserDocument } from '@root/modules/users/users.interface';

export type Role = 'admin' | 'moderator' | 'user';

export function auth(...roles: Role[]): MethodDecorator {
  return (target, key, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]): Promise<any> {
      const [req, res, next] = args as [Request, Response, NextFunction];

      // Authenticate the user using passport
      return new Promise((resolve, reject) => {
        passport.authenticate('jwt', { session: false }, (err: any, user: IUserDocument, info: any) => {
          if (err || !user) {
            throw new ServerError('Unauthorized', 401);
          }
          // Assign the user to the request object
          req.user = user;
          // Role check
          if (roles.length > 0 && (!user.role || !roles.includes(user.role))) {
            return next(new ServerError('Forbidden: Insufficient permissions', 403)); // Use 403 for forbidden access
          }
          // Call the original method
          resolve(originalMethod.apply(this, args));
        })(req, res, next); // Call the authenticate function
      });
    };

    return descriptor;
  };
}
