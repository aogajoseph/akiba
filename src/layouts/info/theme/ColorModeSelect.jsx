import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useMaterialUIController, setDarkMode } from 'context';

export default function ColorModeSelect(props) {
  const [controller, dispatch] = useMaterialUIController();
  const { darkMode } = controller;
  const mode = darkMode ? 'dark' : 'light';
  const setMode = () => {
    setDarkMode(dispatch, !darkMode);
  };

  if (!mode) {
    return null;
  }

  return (
    <Select
      value={mode}
      onChange={(event) => setMode(event.target.value)}
      SelectDisplayProps={{
        'data-screenshot': 'toggle-mode',
      }}
      {...props}
    >
      <MenuItem value="system">System</MenuItem>
      <MenuItem value="light">Light</MenuItem>
      <MenuItem value="dark">Dark</MenuItem>
    </Select>
  );
}
