import { supabase } from '@/integrations/supabase/client';

// Security headers for API responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
};

// Audit logging for security events (simplified without table dependency)
export const auditLog = async (action: string, userId: string | null, details: Record<string, any> = {}) => {
  try {
    // Log to console for now - in production, send to external logging service
    console.log('AUDIT:', {
      action,
      user_id: userId,
      details,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

// Get client IP (best effort in browser environment)
const getClientIP = (): string => {
  // In production, this would need to be handled by the server
  return 'unknown';
};

// Content validation to prevent malicious uploads
export const validateFileContent = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Check for common malware signatures
  const malwareSignatures = [
    [0x4D, 0x5A], // PE executable
    [0x50, 0x4B, 0x03, 0x04], // ZIP with potential executable
    [0x7F, 0x45, 0x4C, 0x46], // ELF executable
  ];
  
  for (const signature of malwareSignatures) {
    if (bytes.length >= signature.length) {
      const match = signature.every((byte, index) => bytes[index] === byte);
      if (match) {
        return { isValid: false, error: 'File contains potentially malicious content' };
      }
    }
  }
  
  // Validate file headers match declared MIME type
  if (file.type.startsWith('image/')) {
    const imageSignatures = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]]
    };
    
    const expectedSignatures = imageSignatures[file.type as keyof typeof imageSignatures];
    if (expectedSignatures) {
      const isValid = expectedSignatures.some(signature => 
        signature.every((byte, index) => bytes[index] === byte)
      );
      if (!isValid) {
        return { isValid: false, error: 'File header does not match declared type' };
      }
    }
  }
  
  return { isValid: true };
};

// Generate secure signed URLs with expiration
export const generateSecureSignedUrl = async (bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    return null;
  }
};

// Secure error handling that doesn't leak sensitive information
export const handleSecureError = (error: any): { message: string; code?: string } => {
  // Log full error details for debugging (server-side only)
  console.error('Security error:', error);
  
  // Return sanitized error message to client
  if (error?.message?.includes('JWT')) {
    return { message: 'Authentication required', code: 'AUTH_REQUIRED' };
  }
  
  if (error?.message?.includes('RLS')) {
    return { message: 'Access denied', code: 'ACCESS_DENIED' };
  }
  
  if (error?.message?.includes('rate limit')) {
    return { message: 'Too many requests', code: 'RATE_LIMITED' };
  }
  
  // Generic error for anything else
  return { message: 'An error occurred', code: 'GENERIC_ERROR' };
};