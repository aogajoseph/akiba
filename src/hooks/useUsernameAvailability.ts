import { useEffect, useMemo, useState } from 'react';

import { checkUsernameAvailability } from '@/services/authService';
import { ApiError } from '@/utils/api';
import { getUsernameValidationError, normalizeUsername } from '@/src/utils/username';

type UsernameAvailabilityState = {
  available: boolean | null;
  checking: boolean;
  error: string | null;
  suggestions: string[];
  validationError: string | null;
};

export const useUsernameAvailability = (
  username: string,
  options?: { enabled?: boolean; initialUsername?: string | null },
): UsernameAvailabilityState => {
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const validationError = useMemo(
    () => (normalizedUsername ? getUsernameValidationError(normalizedUsername) : null),
    [normalizedUsername],
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const initialUsername = options?.initialUsername?.trim().toLowerCase() ?? '';
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled || !normalizedUsername) {
      setAvailable(null);
      setChecking(false);
      setError(null);
      setSuggestions([]);
      return;
    }

    if (normalizedUsername === initialUsername) {
      setAvailable(true);
      setChecking(false);
      setError(null);
      setSuggestions([]);
      return;
    }

    if (validationError) {
      setAvailable(false);
      setChecking(false);
      setError(null);
      setSuggestions([]);
      return;
    }

    setChecking(true);
    setError(null);
    let isActive = true;

    const timeout = setTimeout(() => {
      void checkUsernameAvailability(normalizedUsername)
        .then((result) => {
          if (!isActive) {
            return;
          }
          setAvailable(result.available);
          setSuggestions(result.suggestions);
          setError(null);
        })
        .catch((caughtError) => {
          if (!isActive) {
            return;
          }
          const apiError = caughtError as ApiError;
          setAvailable(null);
          setSuggestions([]);
          setError(apiError.error ?? 'Unable to check username right now.');
        })
        .finally(() => {
          if (isActive) {
            setChecking(false);
          }
        });
    }, 400);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [enabled, initialUsername, normalizedUsername, validationError]);

  return {
    available,
    checking,
    error,
    suggestions,
    validationError,
  };
};
