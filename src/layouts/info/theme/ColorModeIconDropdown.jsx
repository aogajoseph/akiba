import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useMaterialUIController, setDarkMode } from 'context';

export default function ColorModeIconDropdown({ size = 'small' }) {
  const [controller, dispatch] = useMaterialUIController();
  const { darkMode } = controller;
  const mode = darkMode ? 'dark' : 'light';
  const setMode = () => {
    setDarkMode(dispatch, !darkMode);
  };

  return (
    <Tooltip title={`${mode === 'dark' ? 'Light' : 'Dark'} mode`}>
      <IconButton
        onClick={() => {
          setMode(mode === 'dark' ? 'light' : 'dark');
        }}
        size={size}
        sx={{
          color: darkMode ? '#ffffff' : '#1a1a1a',
          '& .MuiSvgIcon-root': {
            color: darkMode ? '#ffffff' : '#1a1a1a'
          }
        }}
      >
        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
