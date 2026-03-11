/**
 * validators.js
 * Input validation helpers used in KYC, Onboarding, and Admin forms.
 */

// ── Identity ──────────────────────────────────────────────────────────────────

/** Validate a 10-digit Indian mobile number (with or without +91). */
export function isValidPhone(phone) {
  return /^(\+91[\s-]?)?[6-9]\d{9}$/.test((phone ?? '').trim());
}

/** Validate an email address. */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email ?? '').trim());
}

/** Validate a 12-digit Aadhaar number. */
export function isValidAadhaar(aadhaar) {
  return /^\d{12}$/.test((aadhaar ?? '').replace(/\s/g, ''));
}

/** Validate a PAN number (format: AAAAA0000A). */
export function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((pan ?? '').toUpperCase().trim());
}

/** Validate an Indian UPI VPA (e.g. name@upi, success@razorpay). */
export function isValidUPI(vpa) {
  return /^[\w.\-+]+@[\w]+$/.test((vpa ?? '').trim());
}

// ── Generic ───────────────────────────────────────────────────────────────────

/** Check if a string is non-empty after trimming. */
export function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Check if a number falls within [min, max] inclusive. */
export function isInRange(value, min, max) {
  const n = Number(value);
  return !isNaN(n) && n >= min && n <= max;
}

// ── Form batch validation ─────────────────────────────────────────────────────

/**
 * Validate a KYC form object and return an errors map.
 * @returns {{ [field: string]: string }} — empty object means valid
 */
export function validateKYCForm({ name, phone, email, aadhaar, pan }) {
  const errors = {};
  if (!isNonEmpty(name))          errors.name    = 'Full name is required.';
  if (!isValidPhone(phone))       errors.phone   = 'Enter a valid 10-digit mobile number.';
  if (email && !isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isValidAadhaar(aadhaar))   errors.aadhaar = 'Enter a valid 12-digit Aadhaar number.';
  if (pan && !isValidPAN(pan))    errors.pan     = 'Enter a valid PAN (e.g. ABCDE1234F).';
  return errors;
}
