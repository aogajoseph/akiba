import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';

// Target payment-provider logos. Keep this section hidden until formal partnerships are confirmed.
const providers = [
  { name: 'M-Pesa', logo: 'https://cdn.simpleicons.org/mpesa' },
  { name: 'Visa', logo: 'https://cdn.simpleicons.org/visa' },
  { name: 'Network International', logo: 'https://logo.clearbit.com/network.ae' },
  { name: 'Mastercard', logo: 'https://cdn.simpleicons.org/mastercard' },
  { name: 'Flutterwave', logo: 'https://logo.clearbit.com/flutterwave.com' },
  { name: 'PayPal', logo: 'https://cdn.simpleicons.org/paypal' },
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
            <Box component="img" src={logo} alt={name} loading="lazy" sx={{ maxWidth: 110, maxHeight: 48, objectFit: 'contain' }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
