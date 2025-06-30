export const brand = {
  50: '#F0F7FF',
  100: '#C6E3FF',
  200: '#8ABEFF',
  300: '#4D99FF',
  400: '#0074FF',
  500: '#0052CC',
  600: '#0047B3',
  700: '#003D99',
  800: '#003380',
  900: '#002966',
};

export const gray = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
};

export const green = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
  900: '#14532D',
};

export const orange = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316',
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
};

export const red = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
};

export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

export const colorSchemes = {
  light: {
    primary: brand[500],
    secondary: gray[500],
    background: {
      default: '#FFFFFF',
      paper: gray[50],
    },
    text: {
      primary: gray[900],
      secondary: gray[500],
    },
  },
  dark: {
    primary: brand[400],
    secondary: gray[400],
    background: {
      default: gray[900],
      paper: gray[800],
    },
    text: {
      primary: gray[50],
      secondary: gray[400],
    },
  },
};

export const typography = {
  fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
};

export const shape = {
  borderRadius: 8,
};

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: brand[500],
      light: brand[400],
      dark: brand[600],
      contrastText: '#fff',
    },
    secondary: {
      main: gray[500],
      light: gray[400],
      dark: gray[600],
      contrastText: '#fff',
    },
    error: {
      main: red[500],
      light: red[400],
      dark: red[600],
      contrastText: '#fff',
    },
    warning: {
      main: orange[500],
      light: orange[400],
      dark: orange[600],
      contrastText: '#fff',
    },
    info: {
      main: brand[400],
      light: brand[300],
      dark: brand[500],
      contrastText: '#fff',
    },
    success: {
      main: green[500],
      light: green[400],
      dark: green[600],
      contrastText: '#fff',
    },
    grey: gray,
    text: {
      primary: gray[900],
      secondary: gray[700],
    },
    background: {
      default: '#fff',
      paper: gray[50],
    },
  },
  typography,
  shape,
  shadows,
}); 