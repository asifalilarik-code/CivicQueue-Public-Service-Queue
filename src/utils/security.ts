/**
 * Security, CNIC (Computerized National Identity Card),
 * and Personal Data Protection Utilities.
 */

export interface ValidationResult {
  valid: boolean;
  isValid: boolean;
  formatted: string;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes Pakistani / National CNIC format: XXXXX-XXXXXXX-X (13 digits).
 */
export function validateCNIC(cnic: string): ValidationResult {
  if (!cnic) {
    return { valid: false, isValid: false, formatted: '', normalized: '', error: 'CNIC is required' };
  }

  // Strip dashes, spaces, and non-numeric characters
  const cleaned = cnic.replace(/\D/g, '');

  if (cleaned.length !== 13) {
    return {
      valid: false,
      isValid: false,
      formatted: cnic,
      normalized: cnic,
      error: `CNIC must contain exactly 13 digits (currently ${cleaned.length} digits)`,
    };
  }

  const formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
  return { valid: true, isValid: true, formatted, normalized: formatted };
}

/**
 * Mask CNIC for public queues and unprivileged displays: 42101-*******-1
 * Preserves province/district code (first 5) and gender checksum (last digit),
 * while keeping citizen identity completely private.
 */
export function maskCNIC(cnic?: string | null): string {
  if (!cnic) return '•••••-•••••••-•';

  const cleaned = cnic.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 5)}-*******-${cleaned.slice(12, 13)}`;
  }

  // Fallback if partial
  if (cleaned.length > 6) {
    return `${cleaned.slice(0, 4)}•••••••${cleaned.slice(-1)}`;
  }
  return '•••••-•••••••-•';
}

/**
 * Validates mobile numbers (Pakistani standard 03XX-XXXXXXX or international +923XXXXXXXXX).
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { valid: false, isValid: false, formatted: '', normalized: '', error: 'Mobile number is required' };
  }

  const cleaned = phone.replace(/[^\d+]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');

  // Must be between 10 and 13 digits
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    return {
      valid: false,
      isValid: false,
      formatted: phone,
      normalized: phone,
      error: 'Please enter a valid mobile number (e.g. 0300-1234567 or +923001234567)',
    };
  }

  let formatted = phone;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('03')) {
    formatted = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('923')) {
    formatted = `+92-${digitsOnly.slice(2, 5)}-${digitsOnly.slice(5)}`;
  }

  return { valid: true, isValid: true, formatted, normalized: formatted };
}

/**
 * Mask mobile number: 0300-***4567
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '••••-•••••••';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length >= 10) {
    const start = cleaned.slice(0, 4);
    const end = cleaned.slice(-3);
    return `${start}-***-${end}`;
  }
  return '••••-•••••••';
}

/**
 * Validates email addresses
 */
export function validateEmail(email: string): { valid: boolean; isValid: boolean; error?: string } {
  if (!email) {
    return { valid: false, isValid: false, error: 'Email address is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isMatch = emailRegex.test(email.trim());
  return {
    valid: isMatch,
    isValid: isMatch,
    error: isMatch ? undefined : 'Please enter a valid email address (e.g. name@domain.com)',
  };
}

/**
 * Validates password strength and criteria
 */
export function validatePassword(password: string): {
  valid: boolean;
  isValid: boolean;
  error?: string;
  strength: 'weak' | 'medium' | 'strong';
} {
  if (!password || password.length < 6) {
    return {
      valid: false,
      isValid: false,
      error: 'Password must be at least 6 characters long',
      strength: 'weak',
    };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 2) {
    strength = 'medium';
  }

  return { valid: true, isValid: true, strength };
}

/**
 * Live auto-formatter for CNIC inputs as user types: formats 4210112345671 -> 42101-1234567-1
 */
export function formatCNICInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Live auto-formatter for mobile inputs
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}
