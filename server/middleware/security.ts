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
    
    // Content Security Policy - stricter for production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const scriptSrc = isDevelopment
      ? "'self' 'unsafe-inline' 'unsafe-eval'"  // Allow for Vite/HMR in dev
      : "'self'";  // Strict in production

    res.setHeader('Content-Security-Policy',
      `default-src 'self'; ` +
      `script-src ${scriptSrc}; ` +
      `style-src 'self' 'unsafe-inline'; ` +  // Some inline styles needed for components
      `img-src 'self' data: https:; ` +
      `font-src 'self' data:; ` +
      `connect-src 'self' ws: wss:;`
    );
    
    next();
  },

  // Input sanitization with improved escaping
  sanitizeInput: (req: Request, res: Response, next: NextFunction) => {
    // HTML escape function
    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
      };
      return text.replace(/[&<>"'/]/g, (char) => map[char]);
    };

    // Recursively sanitize request body
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // For API requests, we typically don't want to escape HTML as data may be JSON
        // Instead, just remove dangerous protocol handlers
        return obj
          .replace(/javascript:/gi, '')
          .replace(/data:text\/html/gi, '')
          .replace(/vbscript:/gi, '')
          .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
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