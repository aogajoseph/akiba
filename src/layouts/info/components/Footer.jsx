import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FacebookIcon from '@mui/icons-material/Facebook';
import YouTubeIcon from '@mui/icons-material/YouTube';import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/X';
import { useMaterialUIController } from 'context';
import logo from '../../../assets/images/logo.png';

function Copyright() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <Typography variant="caption" sx={{ color: darkMode ? '#ffffff' : 'text.secondary', mt: 1 }}>
      {'Copyright ©'}
      {new Date().getFullYear()}
      {' Akiba Ltd.'}
    </Typography>
  );
}

export default function Footer() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const linkStyle = {
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    '&:hover': {
      color: darkMode ? 'info.light' : 'info.main',
    },
  };

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 4, sm: 8 },
        py: { xs: 8, sm: 10 },
        textAlign: { sm: 'center', md: 'left' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: { xs: '100%', sm: '60%' },
          }}
        >
          <Box sx={{ width: { xs: '100%', sm: '60%' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                component="img"
                src={logo}
                alt="Akiba logo"
                sx={{ height: 36, width: 'auto' }}
              />
              <Box
                component="span"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '2rem',
                  color: darkMode ? '#ffffff' : '#1a1a1a'
                }}
              >
                Akiba
              </Box>
            </Box>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, mt: 2, color: darkMode ? '#ffffff' : 'text.primary' }}>
              Join our newsletter
            </Typography>
            <Typography variant="body2" sx={{ color: darkMode ? '#ffffff' : 'text.secondary', mb: 2 }}>
              for exclusive updates on features and insights.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap>
              <TextField
                id="email-newsletter"
                hiddenLabel
                size="small"
                variant="outlined"
                fullWidth
                aria-label="Enter your email address"
                placeholder="Your email address"
                slotProps={{
                  htmlInput: {
                    autoComplete: 'off',
                    'aria-label': 'Enter your email address',
                  },
                }}
                sx={{ 
                  width: '250px',
                  '& .MuiOutlinedInput-root': {
                    color: darkMode ? '#ffffff' : 'text.primary',
                    '& fieldset': {
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                color="info"
                size="small"
                sx={{ 
                  flexShrink: 0,
                  color: '#ffffff',
                  bgcolor: darkMode ? 'primary.main' : 'primary.dark',
                  '&:hover': {
                    bgcolor: darkMode ? 'primary.dark' : 'primary.main',
                  },
                }}
              >
                Subscribe
              </Button>
            </Stack>
          </Box>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Typography variant="overline" sx={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : 'text.primary' }}>
            Product
          </Typography>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="overline" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('about');
            }}
            sx={linkStyle}
          >
            About
          </Link>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="overline" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('getting-started');
            }}
            sx={linkStyle}
          >
            Getting Started
          </Link>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="overline" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('features');
            }}
            sx={linkStyle}
          >
            Features
          </Link>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="overline" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('pricing');
            }}
            sx={linkStyle}
          >
            Pricing
          </Link>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="overline" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('testimonials');
            }}
            sx={linkStyle}
          >
            Testimonials
          </Link>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="overline" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('faq');
            }}
            sx={linkStyle}
          >
            FAQs
          </Link>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Typography variant="overline" sx={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : 'text.primary' }}>
            Company
          </Typography>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            About us
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            Products
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            Blog
          </Link>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Typography variant="overline" sx={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : 'text.primary' }}>
            Legal
          </Typography>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            Terms of Service
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            Privacy Policy
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            Help Center
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="overline" href="#">
            Contact Us
          </Link>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          pt: { xs: 4, sm: 8 },
          width: '100%',
          borderTop: '1px solid',
          borderColor: darkMode ? 'hsla(220, 25%, 25%, 0.3)' : 'divider',
        }}
      >
        <div>
          <Copyright />
        </div>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ justifyContent: 'left', color: darkMode ? '#ffffff' : 'text.secondary' }}
        >
          <IconButton
            color="inherit"
            size="small"
            href="https://www.youtube.com/akiba/"
            aria-label="YouTube"
            sx={{ alignSelf: 'center' }}
          >
            <YouTubeIcon />
          </IconButton>
          <IconButton
            color="inherit"
            size="small"
            href="https://www.linkedin.com/company/akiba/"
            aria-label="LinkedIn"
            sx={{ alignSelf: 'center' }}
          >
            <LinkedInIcon />
          </IconButton>
          <IconButton
            color="inherit"
            size="small"
            href="https://www.facebook.com/akiba/"
            aria-label="Facebook"
            sx={{ alignSelf: 'center' }}
          >
            <FacebookIcon />
          </IconButton>
          <IconButton
            color="inherit"
            size="small"
            href="https://twitter.com/akiba/"
            aria-label="Twitter"
            sx={{ alignSelf: 'center' }}
          >
            <TwitterIcon />
          </IconButton>
        </Stack>
      </Box>
    </Container>
  );
}
