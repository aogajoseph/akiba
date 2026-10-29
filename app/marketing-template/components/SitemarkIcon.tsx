import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type SitemarkIconProps = { size?: 'default' | 'footer' };

export default function SitemarkIcon({ size = 'default' }: SitemarkIconProps) {
 const isFooter = size === 'footer';
 return (
  <Box component="a" href="/welcome" aria-label="Akiba home" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mr: 2, flexShrink: 0, textDecoration: 'none', color: 'text.primary' }}>
   <Box component="img" src="/akiba-logo.png" alt="" sx={{ height: isFooter ? 36 : 28, width: isFooter ? 36 : 28, objectFit: 'contain', flexShrink: 0 }} />
   <Typography component="span" sx={{ fontSize: isFooter ? 27 : 22, fontWeight: 750, letterSpacing: '-1px', color: 'text.primary', lineHeight: 1 }}>
    Akiba
   </Typography>
  </Box>
 );
}
