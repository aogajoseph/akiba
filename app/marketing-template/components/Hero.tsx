import { Box, Button, Container, Link, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
const StyledBox = styled('div')(({ theme }) => ({
  alignSelf: 'center',
  width: '100%',
  height: 400,
  marginTop: theme.spacing(8),
  borderRadius: (theme.vars || theme).shape.borderRadius,
  outline: '6px solid',
  outlineColor: 'hsla(220, 25%, 80%, 0.2)',
  border: '1px solid',
  borderColor: (theme.vars || theme).palette.grey[200],
  boxShadow: '0 0 12px 8px hsla(220, 25%, 80%, 0.2)',
  backgroundImage: `url(${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/screenshots/material-ui/getting-started/templates/dashboard.jpg)`,
  backgroundSize: 'cover',
  [theme.breakpoints.up('sm')]: {
    marginTop: theme.spacing(10),
    height: 700,
  },
  ...theme.applyStyles('dark', {
    boxShadow: '0 0 24px 12px hsla(210, 100%, 25%, 0.2)',
    backgroundImage: `url(${process.env.TEMPLATE_IMAGE_URL || 'https://mui.com'}/static/screenshots/material-ui/getting-started/templates/dashboard-dark.jpg)`,
    outlineColor: 'hsla(220, 20%, 42%, 0.1)',
    borderColor: (theme.vars || theme).palette.grey[700],
  }),
}));


export default function Hero() {
 return <Box id="hero" sx={{scrollMarginTop:110,background:'radial-gradient(ellipse at 50% 0%,rgba(236,30,123,.09),transparent 65%)'}}>
 <Container maxWidth="lg" sx={{pt:{xs:17,md:22},pb:9,textAlign:'center'}}>
 <Typography variant="h1" sx={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:1,fontSize:'clamp(3rem, 10vw, 3.5rem)'}}>Do more <Box component="span" sx={{color:'#E91E78'}}>together</Box></Typography>
 <Typography variant="body1" sx={{maxWidth:900,mx:'auto',mt:3,color:'text.secondary',textAlign:'center'}}>Akiba is a finance coordination platform that helps people contribute and spend money as a team to<Box component="br" sx={{display:{xs:'none',md:'block'}}}/> plan events or achieve shared goals.</Typography>
 <Stack direction={{xs:'column',sm:'row'}} spacing={2} justifyContent="center" sx={{mt:4,maxWidth:370,mx:'auto'}}>
 <Button href="/login" size="medium" variant="outlined" fullWidth sx={{py:1.1}}>Sign In</Button><Button href="/signup" size="medium" variant="contained" fullWidth sx={{py:1.1,bgcolor:'#E91E78','&:hover':{bgcolor:'#C21863'}}}>Create Account</Button></Stack>
 <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:2}}>By signing up to Akiba, you agree to our <Link href="/terms">Terms of Service</Link>.</Typography>
 <StyledBox id="image" />
 </Container></Box>;
}