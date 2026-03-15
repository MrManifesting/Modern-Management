import { Request, Response, NextFunction } from 'express';

export const securityMiddleware = {
  validateRequest: (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    if (contentType && contentType.includes('xml')) {
      return res.status(400).json({ error: 'XML content not allowed' });
    }

    const suspiciousPatterns = [
      /\.\.\//,
      /<script/i,
      /javascript:/i,
    ];

    const url = req.url;
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    next();
  },

  securityHeaders: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' ws: wss: https:; " +
      "frame-ancestors 'self' https://*.replit.dev https://*.replit.app;"
    );

    next();
  },

  sanitizeInput: (req: Request, res: Response, next: NextFunction) => {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/vbscript:/gi, '');
      }
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      return obj;
    };

    if (req.body) {
      req.body = sanitize(req.body);
    }

    next();
  }
};
