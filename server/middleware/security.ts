import { Request, Response, NextFunction } from 'express';

// Security middleware to mitigate various vulnerabilities
export const securityMiddleware = {
  // Strict request validation
  validateRequest: (req: Request, res: Response, next: NextFunction) => {
    // Block potentially malicious XML content
    const contentType = req.get('Content-Type');
    if (contentType && contentType.includes('xml')) {
      return res.status(400).json({ error: 'XML content not allowed' });
    }

    // Validate URL parameters for suspicious patterns
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS attempts
      /javascript:/i, // JavaScript protocol
      /data:/i, // Data URLs
    ];

    const url = req.url;
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    next();
  },

  // Security headers
  securityHeaders: (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict transport security (if HTTPS)
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:;"
    );
    
    next();
  },

  // Input sanitization
  sanitizeInput: (req: Request, res: Response, next: NextFunction) => {
    // Recursively sanitize request body
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Remove potentially dangerous characters
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '')
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