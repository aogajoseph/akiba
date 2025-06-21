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
import { SvgIcon } from '@mui/material';
import { useMaterialUIController } from 'context';
import logo from '../../../assets/images/logo.png';

function Copyright() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <Typography variant="caption" sx={{ color: darkMode ? '#ffffff' : 'text.secondary', mt: 1 }}>
      {'©'}
      {new Date().getFullYear()}
      {' Akiba Ltd.'}
    </Typography>
  );
}

function WhatsAppIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 32 32">
      <path
        className="wa-bubble"
        fill="#25D366"
        d="M16 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.88.773 5.6 2.24 8.013L2 30l6.16-2.027c2.293 1.2 4.867 1.84 7.84 1.84 7.36 0 13.333-5.973 13.333-13.333S23.36 2.667 16 2.667z"
      />
      <path
        className="wa-phone"
        fill="#FFF"
        d="M24.293 19.467c-.4-.2-2.373-1.173-2.747-1.307-.373-.133-.64-.2-.907.2s-1.04 1.307-1.28 1.573c-.24.267-.467.293-.867.093-.4-.2-1.693-.627-3.227-2-1.2-1.067-2-2.4-2.24-2.8-.24-.4-.027-.613.173-.813.173-.173.4-.453.6-.68.2-.227.267-.4.4-.667.133-.267.067-.493-.033-.693-.093-.2-.907-2.2-1.24-3-.32-.76-.64-.653-.867-.667-.227-.013-.48-.013-.733-.013-.267 0-.707.093-1.067.453-.36.36-1.4 1.373-1.4 3.333s1.44 3.867 1.64 4.133c.2.267 2.827 4.333 6.84 6.067 3.893 1.667 3.893 1.12 4.587 1.053.693-.067 2.227-.907 2.547-1.787.32-.88.32-1.64.227-1.787-.093-.147-.36-.24-.76-.44z"
      />
    </SvgIcon>
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
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : 'text.primary' }}>
            Product
          </Typography>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="subtitle2" 
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
            variant="subtitle2" 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('getting-started');
            }}
            sx={linkStyle}
          >
            Get Started
          </Link>
          <Link 
            color={darkMode ? '#ffffff' : 'text.secondary'} 
            variant="subtitle2" 
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
            variant="subtitle2" 
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
            variant="subtitle2" 
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
            variant="subtitle2" 
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
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : 'text.primary' }}>
            Company
          </Typography>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
            About us
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
            Products
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
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
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : 'text.primary' }}>
            Legal
          </Typography>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
            Terms of Service
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
            Privacy Policy
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
            Help Center
          </Link>
          <Link color={darkMode ? '#ffffff' : 'text.secondary'} variant="subtitle2" href="#">
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
          sx={{ justifyContent: 'left' }}
        >
          <IconButton
            size="small"
            href="https://wa.me/1234567890"
            aria-label="WhatsApp"
            sx={{
              alignSelf: 'center',
              '&:hover .wa-bubble': {
                fill: 'grey'
              }
            }}
          >
            <WhatsAppIcon />
          </IconButton>
          <IconButton
            size="small"
            href="https://www.youtube.com/akiba/"
            aria-label="YouTube"
            sx={{
              alignSelf: 'center',
              color: '#FF0000',
              '&:hover': { color: 'grey' }
            }}
          >
            <YouTubeIcon />
          </IconButton>
          <IconButton
            size="small"
            href="https://www.linkedin.com/company/akiba/"
            aria-label="LinkedIn"
            sx={{
              alignSelf: 'center',
              color: '#0A66C2',
              '&:hover': { color: 'grey' }
            }}
          >
            <LinkedInIcon />
          </IconButton>
          <IconButton
            size="small"
            href="https://www.facebook.com/akiba/"
            aria-label="Facebook"
            sx={{
              alignSelf: 'center',
              color: '#1877F2',
              '&:hover': { color: 'grey' }
            }}
          >
            <FacebookIcon />
          </IconButton>
          <IconButton
            size="small"
            href="https://twitter.com/akiba/"
            aria-label="Twitter"
            sx={{
              alignSelf: 'center',
              color: '#1DA1F2',
              '&:hover': { color: 'grey' }
            }}
          >
            <TwitterIcon />
          </IconButton>
        </Stack>
      </Box>
    </Container>
  );
}
