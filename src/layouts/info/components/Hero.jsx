import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useMaterialUIController } from 'context';

const VideoContainer = styled('div')(({ theme }) => ({
  alignSelf: 'center',
  width: '100%',
  maxWidth: '800px', 
  marginTop: theme.spacing(8),
  borderRadius: theme.shape.borderRadius * 1.5,
  overflow: 'hidden',
  boxShadow: '0 0 16px 10px hsla(220, 25%, 80%, 0.2)',
  [theme.breakpoints.up('sm')]: {
    marginTop: theme.spacing(10),
  },
  ...theme.applyStyles?.('dark', {
    boxShadow: '0 0 28px 14px hsla(210, 100%, 25%, 0.2)',
  }),
  '& iframe': {
    width: '100%',
    aspectRatio: '16/9',
    border: 'none',
    maxHeight: '450px',
  }
}));

export default function Hero() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <Box
      id="hero"
      sx={(theme) => ({
        width: '100%',
        backgroundRepeat: 'no-repeat',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210, 100%, 90%), transparent)',
        ...theme.applyStyles('dark', {
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210, 100%, 16%), transparent)',
        }),
      })}
    >
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: { xs: 14, sm: 20 },
          pb: { xs: 8, sm: 12 },
        }}
      >
        <Stack
          spacing={2}
          useFlexGap
          sx={{ alignItems: 'center', width: { xs: '100%', sm: '70%' } }}
        >
          <Typography
            variant="h2"
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              fontSize: 'clamp(3rem, 10vw, 3.5rem)',
              fontWeight: 'regular'
            }}
          >
            Do&nbsp;More,&nbsp;
            <Typography
              component="span"
              variant="h2"
              sx={(theme) => ({
                fontSize: 'inherit',
                fontWeight: 'regular',
                color: 'info.main',
                ...theme.applyStyles('dark', {
                  color: 'primary.light',
                }),
              })}
            >
              together.
            </Typography>
          </Typography>
          <Typography
            sx={{
              textAlign: 'center',
              color: darkMode ? '#ffffff' : 'text.secondary',
              width: { sm: '100%', md: '80%' },
              fontSize: '1.25rem'
            }}
          >
            Akiba is a collaborative savings platform that helps friends, families, organizations and communities save money as a team.
          </Typography>         
          <Typography
            variant="caption"
            sx={{ 
              textAlign: 'center',
              fontWeight: 'bold',
              color: darkMode ? '#ffffff' : 'text.secondary',
              fontSize: '0.9rem'
            }}
          >
            We make saving simple and social — helping people achieve more, together.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            sx={{ 
              pt: 2, 
              width: { xs: '100%', sm: 'auto' },
              justifyContent: 'center'
            }}
          >
            <Button
              variant="outlined"
              color="info"
              size="medium"
              sx={{ 
                minWidth: 'fit-content',
                color: darkMode ? '#ffffff' : 'info.main',
                borderColor: darkMode ? '#ffffff' : 'info.main',
                '&:hover': {
                  borderColor: darkMode ? '#ffffff' : 'info.main',
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(25, 118, 210, 0.1)'
                }
              }}
            >
              Sign In
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="medium"
              sx={{ 
                minWidth: 'fit-content',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: darkMode ? 'info.light' : 'info.dark'
                }
              }}
            >
              Sign Up Now
            </Button>
          </Stack>
        </Stack>
        <VideoContainer>
          <iframe
            src="https://www.youtube.com/embed/your-video-id"
            title="Akiba Platform Overview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </VideoContainer>
      </Container>
    </Box>
  );
}
