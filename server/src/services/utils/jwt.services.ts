import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { config } from '@root/config';
import { ServerError } from 'error-express';

class JwtService {
  public signToken(data: { userId: string; sessionId?: string }, expire?: string): string {
    return jwt.sign(data, config.JWT_SECRET!, {
      expiresIn: expire || '1m'
    });
  }

  public verifyToken(token: string): string | jwt.JwtPayload | undefined {
    try {
      return jwt.verify(token, config.JWT_SECRET!);
    } catch (err) {
      if (err instanceof JsonWebTokenError) {
        throw new ServerError(err?.message, 401);
      }
    }
  }

  public signTokenRefresh(data: { userId: string; sessionId?: string }, expire?: string): string {
    return jwt.sign(data, config.JWT_SECRET_REFRESH!, {
      expiresIn: expire || '7d'
    });
  }

  public verifyTokenRefresh(token: string): string | jwt.JwtPayload | undefined {
    try {
      return jwt.verify(token, config.JWT_SECRET_REFRESH!);
    } catch (err) {
      if (err instanceof JsonWebTokenError) {
        throw new ServerError(err?.message, 401);
      }
    }
  }

  public signVerifyToken(data: { userId: string; sessionId?: string }, expire?: string): string {
    return jwt.sign(data, config.JWT_TOKEN_SECRET!, {
      expiresIn: expire || '15m'
    });
  }

  public verifyVerifyToken(token: string): string | jwt.JwtPayload | undefined {
    try {
      return jwt.verify(token, config.JWT_TOKEN_SECRET!);
    } catch (err) {
      if (err instanceof JsonWebTokenError) {
        throw new ServerError(err?.message, 403);
      }
    }
  }
}

export const jwtService: JwtService = new JwtService();
