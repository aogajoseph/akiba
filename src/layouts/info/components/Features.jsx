import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MuiChip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useMaterialUIController } from 'context';

import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';

const items = [
  {
    icon: <AccountBalanceWalletRoundedIcon />,
    title: 'Flexible Accounts',
    description:
      "Akiba adapts to each group's unique needs, with flexible accounts and the freedom to join or leave freely at any time.",
    imageLight: `url("${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/images/templates/templates-images/dash-light.png")`,
    imageDark: `url("${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/images/templates/templates-images/dash-dark.png")`,
  },
  {
    icon: <SecurityRoundedIcon />,
    title: 'Secure Financial Management',
    description:
      "We ensure transparency and accountability through open communication and a robust governance system.",
    imageLight: `url("${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/images/templates/templates-images/mobile-light.png")`,
    imageDark: `url("${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/images/templates/templates-images/mobile-dark.png")`,
  },
  {
    icon: <GroupsRoundedIcon />,
    title: 'Group Engagement',
    description:
      "Members are connected via private messaging, group chat and real-time reporting, keeping everyone informed and engaged.",
    imageLight: `url("${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/images/templates/templates-images/devices-light.png")`,
    imageDark: `url("${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/images/templates/templates-images/devices-dark.png")`,
  },
];

const Chip = styled(MuiChip)(({ theme, selected }) => ({
  ...(selected && {
    background: theme.palette.mode === 'dark' 
      ? 'linear-gradient(to bottom right, hsl(210, 98%, 35%), hsl(210, 98%, 25%))'
      : 'linear-gradient(to bottom right, hsl(210, 98%, 48%), hsl(210, 98%, 35%))',
    color: 'hsl(0, 0%, 100%)',
    borderColor: theme.palette.mode === 'dark' 
      ? theme.palette.primary.dark 
      : theme.palette.primary.light,
    '& .MuiChip-label': {
      color: 'hsl(0, 0%, 100%)',
    },
  }),
}));

function MobileLayout({ selectedItemIndex, handleItemClick, selectedFeature, darkMode }) {
  if (!items[selectedItemIndex]) {
    return null;
  }

  return (
    <Box
      sx={{
        display: { xs: 'flex', sm: 'none' },
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, overflow: 'auto', pb: 1, pr: 1 }}>
        {items.map(({ title }, index) => (
          <Chip
            size="medium"
            key={index}
            label={title}
            onClick={() => handleItemClick(index)}
            selected={selectedItemIndex === index}
          />
        ))}
      </Box>
      <Card 
        variant="outlined"
        sx={{
          bgcolor: darkMode ? 'grey.800' : 'background.paper',
          borderColor: darkMode ? 'grey.700' : 'divider',
        }}
      >
        <Box
          sx={{
            mb: 2,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: 280,
            backgroundImage: darkMode ? selectedFeature.imageDark : selectedFeature.imageLight,
          }}
        />
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography
            gutterBottom
            sx={{ 
              color: darkMode ? '#ffffff' : 'text.primary',
              fontWeight: 'medium',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {selectedFeature.icon}
            {selectedFeature.title}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: darkMode ? 'grey.300' : 'text.secondary',
              mb: 1.5 
            }}
          >
            {selectedFeature.description}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}

export default function Features() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0);

  const handleItemClick = (index) => {
    setSelectedItemIndex(index);
  };

  const selectedFeature = items[selectedItemIndex];

  return (
    <Container id="features" sx={{ py: { xs: 8, sm: 16 } }}>
      <Box sx={{ width: { sm: '100%', md: '60%' } }}>
        <Typography
          component="h2"
          variant="h4"
          gutterBottom
          sx={{ color: darkMode ? '#ffffff' : 'text.primary' }}
        >
          Product Features
        </Typography>
        <Typography
          variant="body2"
          sx={{ 
            color: darkMode ? 'grey.300' : 'text.secondary',
            mb: { xs: 2, sm: 4 },
            width: { sm: '100%', md: '70%' }
          }}
        >
          Akiba's innovative approach empowers groups to achieve shared goals using modern, secure tools.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row-reverse' },
          gap: 2,
        }}
      >
        <div>
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              flexDirection: 'column',
              gap: 2,
              height: '100%',
            }}
          >
            {items.map(({ icon, title, description }, index) => (
              <Box
                key={index}
                component={Button}
                onClick={() => handleItemClick(index)}
                sx={[
                  {
                    p: 2,
                    height: '100%',
                    width: '100%',
                    '&:hover': {
                      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'action.hover',
                    },
                  },
                  selectedItemIndex === index && {
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'action.selected',
                  },
                ]}
              >
                <Box
                  sx={[
                    {
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'left',
                      gap: 1,
                      textAlign: 'left',
                      textTransform: 'none',
                      color: darkMode ? 'grey.300' : 'text.secondary',
                    },
                    selectedItemIndex === index && {
                      color: darkMode ? '#ffffff' : 'text.primary',
                    },
                  ]}
                >
                  {icon}
                  <Typography variant="h6">{title}</Typography>
                  <Typography variant="body2">{description}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <MobileLayout
            selectedItemIndex={selectedItemIndex}
            handleItemClick={handleItemClick}
            selectedFeature={selectedFeature}
            darkMode={darkMode}
          />
        </div>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            width: { xs: '100%', md: '70%' },
            height: 'var(--items-image-height)',
          }}
        >
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              width: '100%',
              display: { xs: 'none', sm: 'flex' },
              pointerEvents: 'none',
              bgcolor: darkMode ? 'grey.800' : 'background.paper',
              borderColor: darkMode ? 'grey.700' : 'divider',
            }}
          >
            <Box
              sx={{
                m: 'auto',
                width: 420,
                height: 500,
                backgroundSize: 'contain',
                backgroundImage: darkMode ? selectedFeature.imageDark : selectedFeature.imageLight,
              }}
            />
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
