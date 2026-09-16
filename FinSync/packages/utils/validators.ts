/**
 * Validation utilities for FinSync Super
 * Handles PAN, DOB, phone, income, and other field validations
 */

/**
 * Validate Indian PAN card format
 * Format: ABCDE1234F (5 letters, 4 digits, 1 letter)
 */
export function validatePAN(pan: string): { valid: boolean; message?: string } {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  if (!pan) {
    return { valid: false, message: 'PAN is required' };
  }

  if (!panRegex.test(pan)) {
    return { valid: false, message: 'Invalid PAN format. Example: ABCDE1234F' };
  }

  return { valid: true };
}

/**
 * Validate date of birth
 * Must be 18+ years old and not in future
 */
export function validateDOB(dob: string): { valid: boolean; message?: string } {
  if (!dob) {
    return { valid: false, message: 'Date of birth is required' };
  }

  const birthDate = new Date(dob);
  const today = new Date();

  if (birthDate > today) {
    return { valid: false, message: 'Date of birth cannot be in the future' };
  }

  // Calculate age
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    if (age - 1 < 18) {
      return { valid: false, message: 'You must be at least 18 years old' };
    }
  } else if (age < 18) {
    return { valid: false, message: 'You must be at least 18 years old' };
  }

  return { valid: true };
}

/**
 * Validate Indian phone number
 * Format: 10 digits starting with 6-9
 */
export function validatePhone(phone: string): { valid: boolean; message?: string } {
  const phoneRegex = /^[6-9]\d{9}$/;
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone) {
    return { valid: false, message: 'Phone number is required' };
  }

  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, message: 'Invalid phone number. Must be 10 digits starting with 6-9' };
  }

  return { valid: true };
}

/**
 * Validate annual income
 * Must be positive and reasonable (₹0 - ₹100 Cr)
 */
export function validateIncome(income: number | string): { valid: boolean; message?: string } {
  const incomeNum = typeof income === 'string' ? parseFloat(income) : income;

  if (isNaN(incomeNum)) {
    return { valid: false, message: 'Please enter a valid income amount' };
  }

  if (incomeNum < 0) {
    return { valid: false, message: 'Income cannot be negative' };
  }

  if (incomeNum > 1000000000) {
    return { valid: false, message: 'Income seems unusually high. Please verify.' };
  }

  return { valid: true };
}

/**
 * Validate family size
 */
export function validateFamilySize(size: number | string): { valid: boolean; message?: string } {
  const sizeNum = typeof size === 'string' ? parseInt(size) : size;

  if (isNaN(sizeNum) || sizeNum < 1) {
    return { valid: false, message: 'Family size must be at least 1' };
  }

  if (sizeNum > 20) {
    return { valid: false, message: 'Family size seems unusually large' };
  }

  return { valid: true };
}

/**
 * Format PAN to uppercase
 */
export function formatPAN(pan: string): string {
  return pan.toUpperCase().trim();
}

/**
 * Format phone number with country code
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('91')) {
    return `+${cleanPhone}`;
  }
  return `+91${cleanPhone}`;
}

/**
 * Format currency (Indian Rupees)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate monthly income from annual
 */
export function calculateMonthlyIncome(annualIncome: number): number {
  return Math.round(annualIncome / 12);
}

/**
 * Calculate personalised budget breakdown based on income and family size
 * Adjusts the standard 50/30/20 rule to be realistic based on dependents
 */
export function calculatePersonalisedBudget(monthlyIncome: number, familySize: number = 1): {
  needs: number;
  wants: number;
  savings: number;
  total: number;
  rule: string;
} {
  let needsRatio = 0.5;
  let wantsRatio = 0.3;
  let savingsRatio = 0.2;

  // Adjust for family size - Larger families naturally have higher essential Needs
  if (familySize > 1) {
    // For each dependent, needs ratio increases slightly, squeezing wants and savings
    const dependentFactor = (familySize - 1) * 0.05;

    // Cap needs ratio at 75% for extreme cases
    needsRatio = Math.min(0.75, 0.5 + dependentFactor);

    // Adjust remainder
    const remainder = 1 - needsRatio;

    // Wants drop faster than savings to prioritize financial security for families
    wantsRatio = remainder * 0.4;
    savingsRatio = remainder * 0.6;
  }

  // Adjust for income levels (optional logic, keeping it simple based on family for now)
  // Very low income might force needs to be higher regardless of family size.

  return {
    needs: Math.round(monthlyIncome * needsRatio),
    wants: Math.round(monthlyIncome * wantsRatio),
    savings: Math.round(monthlyIncome * savingsRatio),
    total: monthlyIncome,
    rule: `${Math.round(needsRatio * 100)}/${Math.round(wantsRatio * 100)}/${Math.round(savingsRatio * 100)}`,
  };
}

/**
 * Validate complete profile data
 */
export interface ProfileData {
  pan: string;
  dob: string;
  phone: string;
  income: number;
  familySize: number;
}

export function validateProfile(data: Partial<ProfileData>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (data.pan) {
    const panValidation = validatePAN(data.pan);
    if (!panValidation.valid) {
      errors.pan = panValidation.message!;
    }
  }

  if (data.dob) {
    const dobValidation = validateDOB(data.dob);
    if (!dobValidation.valid) {
      errors.dob = dobValidation.message!;
    }
  }

  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.message!;
    }
  }

  if (data.income !== undefined) {
    const incomeValidation = validateIncome(data.income);
    if (!incomeValidation.valid) {
      errors.income = incomeValidation.message!;
    }
  }

  if (data.familySize !== undefined) {
    const familyValidation = validateFamilySize(data.familySize);
    if (!familyValidation.valid) {
      errors.familySize = familyValidation.message!;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
