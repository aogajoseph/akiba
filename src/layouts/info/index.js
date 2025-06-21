import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useEffect } from 'react';
import MarketingPage from './MarketingPage';
import { useMaterialUIController } from 'context';
import theme from 'assets/theme';
import themeDark from 'assets/theme-dark';

export default function InfoPage() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        console.log(`Attempting to scroll to section: ${hash}`);
        
        // Wait for components to be fully rendered
        const scrollToSection = () => {
          const element = document.getElementById(hash);
          if (element) {
            console.log(`Found element for section: ${hash}`);
            // Add a small offset to account for any fixed headers
            const offset = 100; // Increased offset for fixed AppBar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth"
            });
            return true;
          } else {
            console.log(`Element not found for section: ${hash}`);
            return false;
          }
        };

        // Fallback function using scrollIntoView if window.scrollTo fails
        const fallbackScroll = () => {
          const element = document.getElementById(hash);
          if (element) {
            console.log(`Using fallback scroll for section: ${hash}`);
            element.scrollIntoView({ 
              behavior: "smooth",
              block: "start"
            });
            return true;
          }
          return false;
        };

        // Try with longer delays to ensure components are fully rendered
        setTimeout(() => {
          if (!scrollToSection()) {
            setTimeout(() => {
              if (!scrollToSection()) {
                setTimeout(() => {
                  if (!scrollToSection()) {
                    // Try fallback method
                    setTimeout(fallbackScroll, 500);
                  }
                }, 1000);
              }
            }, 500);
          }
        }, 200);
      }
    };

    // Handle initial load with a longer delay
    setTimeout(handleHashScroll, 100);

    // Handle hash changes
    const handleHashChange = () => {
      handleHashScroll();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <MarketingPage />
    </ThemeProvider>
  );
}
