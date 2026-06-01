const KENYAN_LOCAL_PATTERN = /^(0[17]\d{8})$/;
const KENYAN_INTL_PATTERN = /^(?:\+?254)([17]\d{8})$/;

export const normalizePhoneNumber = (input: string): string => {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Phone number is required');
  }

  const compact = trimmed.replace(/[\s-]+/g, '');

  if (KENYAN_LOCAL_PATTERN.test(compact)) {
    return `+254${compact.slice(1)}`;
  }

  const internationalMatch = compact.match(KENYAN_INTL_PATTERN);

  if (internationalMatch) {
    return `+254${internationalMatch[1]}`;
  }

  throw new Error('Invalid Kenyan phone number');
};

export const maskPhoneNumber = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  return `${normalized.slice(0, 7)}****${normalized.slice(-3)}`;
};
