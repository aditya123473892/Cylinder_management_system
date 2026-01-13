import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

class AuthUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Access token required'
        });
        return;
      }

      const decoded = AuthUtils.verifyToken(token);
      if (!decoded) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }

  static authorize(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  }
}
