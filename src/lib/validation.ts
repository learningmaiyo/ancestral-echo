import { z } from 'zod';

// Input validation schemas for security
export const familyMemberSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  
  relationship: z.string()
    .max(50, 'Relationship too long')
    .optional(),
  
  birth_date: z.string()
    .optional(),
  
  bio: z.string()
    .max(1000, 'Bio too long')
    .optional()
});

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long')
    .refine((val) => !/<script|javascript:|data:|vbscript:/i.test(val), 'Invalid content detected')
});

export const recordingMetadataSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .regex(/^[a-zA-Z0-9\s\-'\.!?]+$/, 'Title contains invalid characters'),
  
  description: z.string()
    .max(1000, 'Description too long')
    .optional()
});

export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid filename'),
  
  size: z.number()
    .max(50 * 1024 * 1024, 'File too large (50MB max)'), // 50MB limit
  
  type: z.string()
    .refine((type) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4'
      ];
      return allowedTypes.includes(type);
    }, 'File type not allowed')
});

// Sanitization functions
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_\.]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

// Rate limiting utilities
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (userId: string, action: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
};