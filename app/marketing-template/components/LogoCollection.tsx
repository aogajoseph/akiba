import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';

// Target payment-provider logos for future partnerships; no current partnership is implied.
const providers = [
  { name: 'M-Pesa', logo: 'https://akaunting.com/public/assets/media/4-akaunting-inc/m-pesa/m-pesa-logo_1.png' },
  { name: 'Visa', logo: 'https://cdn.simpleicons.org/visa/1A1F71' },
  { name: 'Network International', logo: 'https://www.google.com/s2/favicons?domain=network.ae&sz=128' },
  { name: 'Mastercard', logo: 'https://cdn.simpleicons.org/mastercard/EB001B' },
  { name: 'Flutterwave', logo: 'https://www.google.com/s2/favicons?domain=flutterwave.com&sz=128' },
  { name: 'PayPal', logo: 'https://cdn.simpleicons.org/paypal/003087' },
];

export default function LogoCollection() {
  return (
    <Box id="logoCollection" sx={{ py: 4 }}>
      <Typography component="h2" variant="subtitle2" align="center" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        Partners
      </Typography>
      <Grid container sx={{ justifyContent: 'center', alignItems: 'center', mt: 0.5, gap: 2 }}>
        {providers.map(({ name, logo }) => (
          <Grid key={name} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 120, height: 80 }}>
            <Tooltip title={name} arrow>
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 110, height: 56, cursor: 'inherit' }}
              >
                <Box
                  component="img"
                  src={logo}
                  alt={name}
                  loading="lazy"
                  sx={{ display: 'block', maxWidth: 110, maxHeight: 48, width: 'auto', height: 'auto', objectFit: 'contain' }}
                />
              </Box>
            </Tooltip>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
