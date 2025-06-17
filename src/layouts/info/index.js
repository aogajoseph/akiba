import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MarketingPage from './MarketingPage';
import { useMaterialUIController } from 'context';
import theme from 'assets/theme';
import themeDark from 'assets/theme-dark';

export default function InfoPage() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <MarketingPage />
    </ThemeProvider>
  );
}
