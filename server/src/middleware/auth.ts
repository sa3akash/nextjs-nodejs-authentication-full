import { NextFunction, Request, Response } from 'express';
import { ServerError } from 'error-express';
import { userModel } from '@root/modules/users/users.model';
import { jwtService } from '@services/utils/jwt.services';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'moderator' | 'user';

export function auth(...roles: Role[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [req, res, next] = args as [Request, Response, NextFunction];

      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;


      // const session = req.cookies.session;
      //
      // const dada = jwt.verify(session,"shu3ztVgn1wZpwu5LaZgNMEx/nWPeloj4hQNUJhhgHE=",{
      //   algorithms: ['HS256'],
      // })


      if (!token) {
        throw new ServerError('Unauthorized: No token provided', 404);
      }

      const tokenUser = jwtService.verifyToken(token) as { userId: string };

      if (!tokenUser) {
        throw new ServerError('Unauthorized: Invalid token', 401);
      }

      const userInDB = await userModel.findById(tokenUser.userId);

      if (!userInDB) {
        throw new ServerError('Unauthorized: User not found', 401);
      }

      req.user = userInDB;

      if (roles.length > 0 && !roles.includes(userInDB.role)) {
        throw new ServerError('Forbidden: Insufficient permissions', 403); // Use 403 for forbidden access
      }

      // Call the original method with the updated context
      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
