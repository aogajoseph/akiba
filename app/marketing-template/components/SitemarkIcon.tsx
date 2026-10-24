import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
export default function SitemarkIcon() {
 return <Box component="a" href="/welcome" aria-label="Akiba home" sx={{display:'inline-flex',alignItems:'center',gap:1,textDecoration:'none',color:'text.primary'}}>
 <Box component="img" src="/akiba-logo.png" alt="" sx={{height:38,width:38,objectFit:'contain'}}/>
 <Typography variant="h6">Akiba</Typography></Box>;
}