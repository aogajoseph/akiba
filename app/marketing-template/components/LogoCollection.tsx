import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';

// Target payment-provider logos. Keep this section hidden until formal partnerships are confirmed.
const providers = [
  { name: 'M-Pesa', logo: 'https://www.google.com/s2/favicons?domain=safaricom.co.ke&sz=128', showName: true },
  { name: 'Visa', logo: 'https://cdn.simpleicons.org/visa' },
  { name: 'Network International', logo: 'https://www.google.com/s2/favicons?domain=network.ae&sz=128', showName: true },
  { name: 'Mastercard', logo: 'https://cdn.simpleicons.org/mastercard' },
  { name: 'Flutterwave', logo: 'https://www.google.com/s2/favicons?domain=flutterwave.com&sz=128', showName: true },
  { name: 'PayPal', logo: 'https://cdn.simpleicons.org/paypal' },
];

export default function LogoCollection() {
  return (
    <Box id="logoCollection" sx={{ py: 4 }}>
      <Typography component="h2" variant="subtitle2" align="center" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        Partners
      </Typography>
      <Grid container sx={{ justifyContent: 'center', alignItems: 'center', mt: 0.5, gap: 2 }}>
        {providers.map(({ name, logo, showName }) => (
          <Grid key={name} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 120, height: 80 }}>
            <Tooltip title={name} arrow>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1, cursor: 'inherit' }}>
                <Box component="img" src={logo} alt={name} loading="lazy" sx={{ maxWidth: showName ? 36 : 110, maxHeight: 48, objectFit: 'contain' }} />
                {showName && <Typography variant="body2" sx={{ fontWeight: 700, maxWidth: 110 }}>{name}</Typography>}
              </Box>
            </Tooltip>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
