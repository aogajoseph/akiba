import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Sitemark() {
  return (
    <Box component="a" href="/" aria-label="Akiba home" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mr: 2, textDecoration: 'none', flexShrink: 0 }}>
      <Box aria-hidden="true" sx={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '9px 9px 9px 3px', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800, fontSize: 18, lineHeight: 1 }}>a</Box>
      <Typography component="span" sx={{ fontSize: 22, fontWeight: 750, letterSpacing: '-1px', color: 'text.primary' }}>akiba</Typography>
    </Box>
  );
}
