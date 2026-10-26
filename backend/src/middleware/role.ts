import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../models/User';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.userRole) {
      res.status(401).json({ success: false, message: 'Unauthorized. Authentication is required.' });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.userRole}' does not have sufficient permissions to access this resource.`,
      });
      return;
    }

    next();
  };
}
