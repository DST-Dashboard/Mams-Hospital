/**
 * [BE-03] OWNER: backend · Password policy validator.
 * Enforces enterprise hospital password security rules:
 * - Minimum 8 characters, maximum 128 characters
 * - Requires at least one letter and at least one number or symbol
 * - Blocks common weak / trivial passwords
 */

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "admin123",
  "12345678",
  "123456789",
  "changeme",
  "hospital",
  "mams1234",
  "qwertyuiop",
  "welcome1",
  "letmein1",
]);

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password must not exceed 128 characters" };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, error: "Password is too common; choose a more secure password" };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!hasLetter || !hasNumberOrSymbol) {
    return {
      valid: false,
      error: "Password must contain at least one letter and one number or special character",
    };
  }

  return { valid: true };
}

export function assertPasswordPolicy(password: string): void {
  const res = validatePassword(password);
  if (!res.valid) {
    throw new Error(res.error ?? "Invalid password");
  }
}
