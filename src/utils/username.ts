export const USERNAME_PATTERN = /^[a-z0-9._]+$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const normalizeUsername = (value: string): string => value.trim().toLowerCase();

export const getUsernameValidationError = (value: string): string | null => {
  const normalized = normalizeUsername(value);

  if (!normalized) {
    return 'Username is required.';
  }

  if (normalized.length < USERNAME_MIN_LENGTH || normalized.length > USERNAME_MAX_LENGTH) {
    return `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`;
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Use lowercase letters, numbers, underscores, or periods only.';
  }

  if (/^[._]|[._]$/.test(normalized)) {
    return 'Username cannot start or end with punctuation.';
  }

  if (/[._]{2,}|[._][._]/.test(normalized)) {
    return 'Username cannot contain repeated punctuation.';
  }

  return null;
};
