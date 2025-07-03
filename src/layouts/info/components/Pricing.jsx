import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useMaterialUIController } from 'context';
import { useNavigate } from 'react-router-dom';

const tiers = [
  {
    title: 'Basic',
    price: '0',
    description: [
      'Up to 20 Members',
      'Up to 2 Sub-Admins',
      'Group & private chat',
      'Reports (view only)',
    ],
    buttonText: 'Sign up for free',
    buttonVariant: 'outlined',
    buttonColor: 'info',
  },
  {
    title: 'For Groups',
    subheader: 'Recommended',
    price: '500',
    description: [
      'Up to 100 Members',
      'Up to 5 Sub-Admins',
      'Group & private chat',
      'Reports (download/share)',
      'Help center access',
      'Personalized reminders',
    ],
    buttonText: 'Sign up for free',
    buttonVariant: 'contained',
    buttonColor: 'secondary',
  },
  {
    title: 'For Oganizations',
    price: '2000',
    description: [
      'Unlimited Members',
      'Up to 10 Sub-Admins',
      'Branded reports (download/share)',
      'Priority support (phone & email)',
    ],
    buttonText: 'Sign up for free',
    buttonVariant: 'outlined',
    buttonColor: 'info',
  },
];

export default function Pricing() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/auth/sign-up');
  };

  return (
    <Container
      id="pricing"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Box
        sx={{
          width: { sm: '100%', md: '60%' },
          textAlign: { sm: 'left', md: 'center' },
        }}
      >
        <Typography
          component="h2"
          variant="h4"
          gutterBottom
          sx={{ 
            color: darkMode ? '#ffffff' : 'text.info',
            fontWeight: 700,
          }}
        >
          Pricing (Coming Soon)
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: darkMode ? 'grey.300' : 'text.secondary',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          Akiba is currently in launch mode, so all plans are 100% free! We’re committed to giving you the best experience during our first 6 months. After this period, the following plans will be available:
        </Typography>
      </Box>
      <Grid
        container
        spacing={3}
        sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}
      >
        {tiers.map((tier) => (
          <Grid
            item
            xs={12}
            sm={tier.title === 'Enterprise' ? 12 : 6}
            md={4}
            key={tier.title}
          >
            <Card
              sx={[
                {
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  bgcolor: darkMode ? 'grey.800' : 'background.paper',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: darkMode
                      ? '0 8px 16px rgba(0, 0, 0, 0.3)'
                      : '0 8px 16px rgba(0, 0, 0, 0.1)',
                  },
                },
                tier.title === 'For Groups' && {
                  border: 'none',
                  bgcolor: darkMode ? 'grey.700' : 'grey.100',
                  boxShadow: darkMode
                    ? '0 8px 12px rgba(0, 0, 0, 0.3)'
                    : '0 8px 12px rgba(0, 0, 0, 0.1)',
                },
              ]}
            >
              <CardContent>
                <Box
                  sx={[
                    {
                      mb: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      color: darkMode ? '#ffffff' : 'text.info',
                    },
                  ]}
                >
                  <Typography 
                    component="h3" 
                    variant="h6"
                    sx={{ fontWeight: 600 }}
                  >
                    {tier.title}
                  </Typography>
                  {tier.title === 'For Groups' && (
                    <Chip 
                      icon={<AutoAwesomeIcon />} 
                      label={tier.subheader}
                      sx={{
                        bgcolor: darkMode ? 'info.dark' : 'info.light',
                        color: darkMode ? '#ffffff' : 'info.contrastText',
                      }}
                    />
                  )}
                </Box>
                <Box
                  sx={[
                    {
                      display: 'flex',
                      alignItems: 'baseline',
                      color: darkMode ? '#ffffff' : 'text.info',
                    },
                  ]}
                >
                  <Typography 
                    component="h3" 
                    variant="h2"
                    sx={{ fontWeight: 700 }}
                  >
                    Ksh. {tier.price}
                  </Typography>
                  <Typography 
                    component="h3" 
                    variant="h6"
                    sx={{ color: darkMode ? 'grey.300' : 'text.secondary' }}
                  >
                    &nbsp; per month
                  </Typography>
                </Box>
                <Divider sx={{ my: 2, opacity: 0.8, borderColor: 'divider' }} />
                {tier.description.map((line) => (
                  <Box
                    key={line}
                    sx={{ py: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}
                  >
                    <CheckCircleRoundedIcon
                      sx={[
                        { width: 20 },
                        tier.title === 'For Groups'
                          ? { color: darkMode ? 'info.light' : 'info.main' }
                          : { color: darkMode ? 'info.light' : 'info.main' },
                      ]}
                    />
                    <Typography
                      variant="subtitle2"
                      component="span"
                      sx={{ 
                        color: darkMode ? 'grey.300' : 'text.secondary',
                        fontSize: '0.875rem',
                      }}
                    >
                      {line}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant={tier.buttonVariant}
                  color={tier.buttonColor}
                  onClick={handleSignUp}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    color: darkMode ? '#ffffff' : tier.buttonVariant === 'contained' ? '#ffffff' : 'info.main',
                    borderColor: !darkMode && tier.buttonVariant === 'outlined' ? 'info.main' : undefined,
                    '&:hover': {
                      borderColor: !darkMode && tier.buttonVariant === 'outlined' ? 'info.dark' : undefined,
                    }
                  }}
                >
                  {tier.buttonText}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footnotes */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '800px',
          mt: 4,
          px: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: darkMode ? '#ffffff' : 'text.info',
            fontWeight: 600,
            mb: 2,
          }}
        >
          Additional Information
        </Typography>
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            pl: 0,
            '& li': {
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              mb: 1.5,
              color: darkMode ? 'grey.300' : 'text.secondary',
              fontSize: '0.875rem',
              '&::before': {
                content: '"•"',
                color: darkMode ? 'info.light' : 'info.main',
                fontSize: '1.2rem',
                lineHeight: 1,
              }
            }
          }}
        >
          <li>Transparent transaction fees apply for transfers, withdrawals and payments.</li>
          <li>Optional add-ons: Admin badges, SMS reminders, custom branding and connected accounts.</li>
        </Box>
      </Box>
    </Container>
  );
}
