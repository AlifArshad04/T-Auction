import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  isAdmin?: boolean;
}

// Basic authentication middleware for admin routes
export const requireAdminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  // Decode base64 credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Check if credentials match admin credentials
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not set in environment variables');
    res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
    return;
  }

  if (username === 'admin' && password === adminPassword) {
    req.isAdmin = true;
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
};

// Verify admin authentication (returns boolean for socket auth)
export const verifyAdminAuth = (authHeader: string | undefined): boolean => {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  // Decode base64 credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const adminPassword = process.env.ADMIN_PASSWORD;
  return username === 'admin' && password === adminPassword && password === adminPassword;
};
