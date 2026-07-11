export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Password must contain at least 12 characters.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain an uppercase letter.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain a lowercase letter.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain a number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain a special character.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
