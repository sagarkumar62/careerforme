import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { _id: string };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let tokenSource: 'header' | 'cookie' | 'none' = 'none';
  let token: string | undefined = undefined;

  try {
    // Authorization header takes precedence over browser cookies
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenSource = 'header';
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
      tokenSource = 'cookie';
    }

    if (env.NODE_ENV === 'development') {
      logger.info(`[AuthMiddleware] ${req.method} ${req.path} | Token present: ${Boolean(token)} | Token source: ${tokenSource} | Length: ${token?.length || 0}`);
    }

    if (!token) {
      throw ApiError.unauthorized('Authentication token missing. Please log in.');
    }

    const decoded = verifyAccessToken(token);

    const userExists = await User.findById(decoded.userId).lean();
    if (!userExists) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    req.user = {
      ...decoded,
      _id: decoded.userId,
    };

    if (env.NODE_ENV === 'development') {
      logger.info(`[AuthMiddleware] JWT verification success | Authenticated User ID: ${decoded.userId}`);
    }

    next();
  } catch (error: any) {
    if (env.NODE_ENV === 'development') {
      logger.warn(`[AuthMiddleware] Auth verification failed on ${req.method} ${req.path} | Source: ${tokenSource} | Error: ${error.message}`);
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Invalid or expired authentication token.'));
    } else {
      next(error);
    }
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined = undefined;

  try {
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const userExists = await User.findById(decoded.userId).lean();
      if (userExists) {
        req.user = {
          ...decoded,
          _id: decoded.userId,
        };
        return next();
      }
    }
  } catch (error: any) {
    // Ignore token validation failure in optionalAuth and proceed to guest fallback
  }

  const DEFAULT_GUEST_ID = '6a8fcd23ea40b7b492ba5cee';
  req.user = {
    userId: DEFAULT_GUEST_ID,
    _id: DEFAULT_GUEST_ID,
    email: 'guest@pathfinder.ai',
    role: 'user',
  };

  next();
};
