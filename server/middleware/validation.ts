/**
 * Request validation middleware using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'Validation failed',
          {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          }
        );
        return res.status(validationError.statusCode).json(validationError.toJSON());
      }
      next(error);
    }
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'Query parameter validation failed',
          {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          }
        );
        return res.status(validationError.statusCode).json(validationError.toJSON());
      }
      next(error);
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'URL parameter validation failed',
          {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          }
        );
        return res.status(validationError.statusCode).json(validationError.toJSON());
      }
      next(error);
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // ID parameter
  id: z.object({
    id: z.coerce.number().int().positive(),
  }),

  // Email
  email: z.string().email().toLowerCase().trim(),

  // Password (minimum 8 characters, at least one letter and one number)
  password: z.string().min(8).regex(
    /^(?=.*[A-Za-z])(?=.*\d)/,
    'Password must contain at least one letter and one number'
  ),

  // URL
  url: z.string().url(),

  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }).refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: 'Start date must be before or equal to end date',
      path: ['startDate'],
    }
  ),

  // Item status
  itemStatus: z.enum(['active', 'inactive', 'archived', 'sold']),

  // Sort order
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
};

/**
 * Item-specific validation schemas
 */
export const itemSchemas = {
  create: z.object({
    name: z.string().min(1).max(255).trim(),
    description: z.string().max(5000).optional(),
    sku: z.string().max(100).optional(),
    price: z.number().nonnegative(),
    quantity: z.number().int().nonnegative().default(0),
    weight: z.string().max(50).optional(),
    tier: z.string().max(50).optional(),
    thcaPercentage: z.string().max(20).optional(),
    image: z.string().url().optional().or(z.literal('')),
    barcode: z.string().max(100).optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().max(5000).optional(),
    price: z.number().nonnegative().optional(),
    quantity: z.number().int().nonnegative().optional(),
    weight: z.string().max(50).optional(),
    tier: z.string().max(50).optional(),
    thcaPercentage: z.string().max(20).optional(),
    image: z.string().url().optional().or(z.literal('')),
    status: commonSchemas.itemStatus.optional(),
  }),

  bulkUpdate: z.object({
    ids: z.array(z.number().int().positive()).min(1),
    updates: z.object({
      price: z.number().nonnegative().optional(),
      quantity: z.number().int().nonnegative().optional(),
      status: commonSchemas.itemStatus.optional(),
      tier: z.string().max(50).optional(),
    }),
  }),
};

/**
 * User/Auth validation schemas
 */
export const authSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: z.string().min(1).max(100).trim().optional(),
    lastName: z.string().min(1).max(100).trim().optional(),
  }),

  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1), // Don't validate password format on login
  }),
};

/**
 * Shopify webhook validation schema
 */
export const shopifySchemas = {
  orderWebhook: z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    order_id: z.union([z.string(), z.number()]).optional(),
    order_name: z.string().optional(),
    line_items: z.array(z.object({
      sku: z.string().optional(),
      quantity: z.number().int().positive(),
      title: z.string().optional(),
      price: z.string().optional(),
    })).default([]),
    subtotal_price: z.union([z.string(), z.number()]).optional(),
    total_price: z.union([z.string(), z.number()]).optional(),
    test: z.union([z.boolean(), z.string()]).optional(),
  }),
};
