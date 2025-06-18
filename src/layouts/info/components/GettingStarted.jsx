import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import { useMaterialUIController } from 'context';

const items = [
  {
    icon: <PersonAddRoundedIcon />,
    title: 'Account Creation',
    description:
      'Set up your Akiba account quickly and securely in four simple steps.',
    access: 'Everyone',
  },
  {
    icon: <FlagRoundedIcon />,
    title: 'Goals Creation',
    description:
      'Define shared financial goals that all the members agree on.',
    access: 'Main Admin Only',
  },
  {
    icon: <GroupAddRoundedIcon />,
    title: 'Member Invitations',
    description:
      "Ask people to join your account and take control by approving those they invite.",
    access: 'Everyone',
  },
  {
    icon: <AdminPanelSettingsRoundedIcon />,
    title: 'Sub-Admins Selection',
    description:
      "Appoint sub-admins to assist in managing finances and other group activities.",
    access: 'Main Admin Only',
  },
  {
    icon: <ForumRoundedIcon />,
    title: 'Group Engagement',
    description:
      'Encourage participation in the forum section or chat privately with members.',
    access: 'Everyone',
  },
  {
    icon: <BarChartRoundedIcon />,
    title: 'Activity Tracking',
    description:
      'View progress from dashboard overview or the Reports page. ',
    access: 'Everyone',
  },
];

export default function GettingStarted() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <Box
      id="getting-started"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        color: darkMode ? '#ffffff' : 'text.primary',
      }}
    >
      <Container
        sx={{
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
              color: darkMode ? '#ffffff' : 'text.primary',
              fontWeight: 700,
            }}
          >
            Getting Started
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: darkMode ? 'grey.300' : 'text.secondary',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            Set up your Akiba account in just a few simple steps. Start saving with your friends, family or any group and achieve your shared financial goals as a team
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {items.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Stack
                direction="column"
                component={Card}
                spacing={1}
                useFlexGap
                sx={{
                  color: 'inherit',
                  p: 3,
                  height: '100%',
                  borderColor: darkMode ? 'hsla(220, 25%, 25%, 0.3)' : 'divider',
                  backgroundColor: darkMode ? 'grey.800' : 'background.paper',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: darkMode
                      ? '0 8px 16px rgba(0, 0, 0, 0.3)'
                      : '0 8px 16px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <Box 
                  sx={{ 
                    opacity: darkMode ? '0.8' : '0.6',
                    color: darkMode ? 'info.light' : 'info.main',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  {item.icon}
                </Box>
                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: darkMode ? '#ffffff' : 'text.primary',
                    }}
                  >
                    Step {index + 1}: {item.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: darkMode ? 'grey.300' : 'text.secondary',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      mb: 1,
                      flex: 1,
                    }}
                  >
                    {item.description}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode ? 'info.light' : 'info.main',
                      fontWeight: 600,
                      display: 'block',
                      textAlign: 'right',
                      mt: 'auto',
                      pt: 1,
                    }}
                  >
                    Access: {item.access}
                  </Typography>
                </div>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
