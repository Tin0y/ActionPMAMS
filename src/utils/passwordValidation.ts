export interface PasswordRequirementChecks {
  minLength: boolean;
  upperAndLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function getPasswordRequirementChecks(password: string): PasswordRequirementChecks {
  const safe = typeof password === 'string' ? password : '';
  return {
    minLength: safe.length >= 8 && safe.length <= 128,
    upperAndLower: /[A-Z]/.test(safe) && /[a-z]/.test(safe),
    hasNumber: /[0-9]/.test(safe),
    hasSpecial: /[^A-Za-z0-9\s]/.test(safe)
  };
}

/**
 * Validates that a password satisfies all four Security Settings requirements:
 * 8-128 characters, both uppercase and lowercase letters, at least one digit,
 * and at least one non-whitespace special character.
 */
export function validateStrongPasswordRequirements(
  password: unknown
): { valid: boolean; message?: string; checks: PasswordRequirementChecks } {
  const emptyChecks: PasswordRequirementChecks = {
    minLength: false,
    upperAndLower: false,
    hasNumber: false,
    hasSpecial: false
  };

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, message: 'Password is required.', checks: emptyChecks };
  }
  if (password.trim().length === 0) {
    return {
      valid: false,
      message: 'Password cannot consist solely of whitespace.',
      checks: emptyChecks
    };
  }
  if (password !== password.trim()) {
    return {
      valid: false,
      message: 'Password cannot start or end with spaces.',
      checks: getPasswordRequirementChecks(password)
    };
  }

  const checks = getPasswordRequirementChecks(password);
  if (password.length > 128) {
    return {
      valid: false,
      message: 'Password must not exceed 128 characters.',
      checks
    };
  }
  if (!checks.minLength) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long.',
      checks
    };
  }
  if (!checks.upperAndLower) {
    return {
      valid: false,
      message: 'Password must contain both uppercase and lowercase letters.',
      checks
    };
  }
  if (!checks.hasNumber) {
    return {
      valid: false,
      message: 'Password must contain at least one number.',
      checks
    };
  }
  if (!checks.hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least one special character.',
      checks
    };
  }

  return { valid: true, checks };
}
