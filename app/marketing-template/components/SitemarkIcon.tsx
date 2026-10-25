import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
export default function SitemarkIcon() {
 return <Box component="a" href="/welcome" aria-label="Akiba home" sx={{display:'inline-flex',alignItems:'center',gap:1,mr:2,flexShrink:0,textDecoration:'none',color:'text.primary'}}>
 <Box component="img" src="/akiba-logo.png" alt="" sx={{height:28,width:28,objectFit:'contain'}}/>
 <Typography component="span" sx={{fontSize:22,fontWeight:750,letterSpacing:"-1px",color:"text.primary",lineHeight:1}}>Akiba</Typography></Box>;
}