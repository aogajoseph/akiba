import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ColorModeIconDropdown from '../theme/ColorModeIconDropdown';
import { useMaterialUIController } from 'context';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
  backdropFilter: 'blur(24px)',
  border: '1px solid',
  borderColor: (theme.vars || theme).palette.divider,
  backgroundColor: theme.vars
    ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.4)`
    : alpha(theme.palette.background.default, 0.4),
  boxShadow: (theme.vars || theme).shadows[1],
  padding: '8px 12px',
}));

export default function MainAppBar() {
  const [open, setOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('');
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const navigate = useNavigate();

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const scrollToSection = (sectionId) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('top');
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(sectionId);
      }
    }
    setOpen(false); // Close drawer if open
  };

  // Add scroll spy functionality
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      
      // If at the top, set active section to 'top'
      if (scrollPosition < 100) {
        setActiveSection('top');
        return;
      }

      const sections = ['hero', 'getting-started', 'features', 'pricing', 'testimonials', 'faq'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop - 100 && scrollPosition < offsetTop + offsetHeight - 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navButtonStyle = (sectionId) => ({
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: '50%',
      transform: activeSection === sectionId ? 'translateX(-50%)' : 'translateX(-50%) scaleX(0)',
      width: '100%',
      height: '2px',
      backgroundColor: darkMode ? 'info.light' : 'info.main',
      transition: 'transform 0.3s ease',
    },
    '&:hover::after': {
      transform: 'translateX(-50%) scaleX(1)',
    },
    color: activeSection === sectionId 
      ? (darkMode ? 'info.light' : 'info.main')
      : (darkMode ? '#ffffff' : 'text.primary'),
    fontWeight: activeSection === sectionId ? 600 : 400,
  });

  const handleAuthNavigation = (path) => {
    navigate(path);
  };

  return (
    <AppBar
      position="fixed"
      enableColorOnDark
      sx={{
        boxShadow: 0,
        bgcolor: 'transparent',
        backgroundImage: 'none',
        mt: 'calc(var(--template-frame-height, 0px) + 28px)',
      }}
    >
      <Container maxWidth="lg">
        <StyledToolbar variant="dense" disableGutters>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: 0 }}>
            <Box
              component="img"
              src={logo}
              alt="Akiba logo"
              sx={{ height: 26, width: 'auto', mr: 1, cursor: 'pointer' }}
              onClick={() => scrollToSection('top')}
            />
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                fontSize: '1rem',
                mr: 2,
                color: darkMode ? '#ffffff' : '#1a1a1a',
                cursor: 'pointer'
              }}
              onClick={() => scrollToSection('top')}
            >
              Akiba
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.25 }}>
              <Button 
                variant="text" 
                color="info" 
                size="small"
                onClick={() => scrollToSection('hero')}
                sx={navButtonStyle('hero')}
              >
                About
              </Button>
              <Button 
                variant="text" 
                color="info" 
                size="small"
                onClick={() => scrollToSection('getting-started')}
                sx={navButtonStyle('getting-started')}
              >
                Getting Started
              </Button>
              <Button 
                variant="text" 
                color="info" 
                size="small"
                onClick={() => scrollToSection('features')}
                sx={navButtonStyle('features')}
              >
                Features
              </Button>
              <Button 
                variant="text" 
                color="info" 
                size="small"
                onClick={() => scrollToSection('pricing')}
                sx={navButtonStyle('pricing')}
              >
                Pricing
              </Button>
              <Button 
                variant="text" 
                color="info" 
                size="small" 
                sx={{ minWidth: 0, ...navButtonStyle('testimonials') }}
                onClick={() => scrollToSection('testimonials')}
              >
                Testimonials
              </Button>
              <Button 
                variant="text" 
                color="info" 
                size="small" 
                sx={{ minWidth: 0, ...navButtonStyle('faq') }}
                onClick={() => scrollToSection('faq')}
              >
                FAQs
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 0.5,
              alignItems: 'center',
            }}
          >
            <Button 
              color="info" 
              variant="text" 
              size="small"
              onClick={() => handleAuthNavigation('/auth/sign-in')}
            >
              Sign in
            </Button>
            <Button 
              color="text" 
              variant="contained" 
              size="small"
              onClick={() => handleAuthNavigation('/auth/sign-up')}
              sx={{
                color: darkMode ? '#1a1a1a' : '#1a1a1a'
              }}
            >
              Create Account
            </Button>
            <ColorModeIconDropdown />
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1 }}>
            <ColorModeIconDropdown size="medium" />
            <IconButton 
              aria-label="Menu button" 
              onClick={toggleDrawer(true)}
              sx={{
                color: darkMode ? '#ffffff' : '#1a1a1a',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="top"
              open={open}
              onClose={toggleDrawer(false)}
              PaperProps={{
                sx: {
                  top: 'var(--template-frame-height, 0px)',
                },
              }}
            >
              <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <IconButton 
                    onClick={toggleDrawer(false)}
                    sx={{
                      color: darkMode ? '#ffffff' : '#1a1a1a',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <CloseRoundedIcon />
                  </IconButton>
                </Box>
                <MenuItem onClick={() => scrollToSection('hero')}>About</MenuItem>
                <MenuItem onClick={() => scrollToSection('getting-started')}>Getting Started</MenuItem>
                <MenuItem onClick={() => scrollToSection('features')}>Features</MenuItem>
                <MenuItem onClick={() => scrollToSection('pricing')}>Pricing</MenuItem>
                <MenuItem onClick={() => scrollToSection('testimonials')}>Testimonials</MenuItem>
                <MenuItem onClick={() => scrollToSection('faq')}>FAQs</MenuItem>
                <Divider sx={{ my: 3 }} />
                <MenuItem>
                  <Button 
                    color="primary" 
                    variant="contained" 
                    fullWidth
                    onClick={() => handleAuthNavigation('/auth/sign-up')}
                    sx={{
                      color: darkMode ? '#1a1a1a' : '#ffffff',
                      backgroundColor: darkMode ? 'info.light' : 'info.main',
                      '&:hover': {
                        backgroundColor: darkMode ? 'info.main' : 'info.dark',
                      },
                    }}
                  >
                    Sign up
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button 
                    color="primary" 
                    variant="outlined" 
                    fullWidth
                    onClick={() => handleAuthNavigation('/auth/sign-in')}
                    sx={{
                      color: darkMode ? 'info.light' : 'info.main',
                      borderColor: darkMode ? 'info.light' : 'info.main',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(25, 118, 210, 0.04)',
                        borderColor: darkMode ? 'info.main' : 'info.dark',
                      },
                    }}
                  >
                    Sign in
                  </Button>
                </MenuItem>
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
