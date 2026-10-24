import { Box, Button, Container, Link, Paper, Stack, Typography, Chip } from '@mui/material';
export default function Hero() {
 return <Box id="hero" sx={{scrollMarginTop:110,background:'radial-gradient(ellipse at 50% 0%,rgba(236,30,123,.09),transparent 65%)'}}>
 <Container maxWidth="lg" sx={{pt:{xs:17,md:22},pb:9,textAlign:'center'}}>
 <Typography variant="h1" sx={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:1,fontSize:'clamp(3rem, 10vw, 3.5rem)'}}>Do more <Box component="span" sx={{color:'#E91E78'}}>together</Box></Typography>
 <Typography variant="body1" sx={{maxWidth:790,mx:'auto',mt:3,color:'text.secondary',textAlign:'center'}}>Akiba is a finance coordination platform that helps people contribute and spend money as a team to plan events or achieve shared goals.</Typography>
 <Stack direction={{xs:'column',sm:'row'}} spacing={2} justifyContent="center" sx={{mt:4,maxWidth:450,mx:'auto'}}>
 <Button href="/login" size="large" variant="outlined" fullWidth sx={{py:1.6}}>Sign In</Button><Button href="/signup" size="large" variant="contained" fullWidth sx={{py:1.6,bgcolor:'#E91E78','&:hover':{bgcolor:'#C21863'}}}>Create Account</Button></Stack>
 <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:2}}>By signing up to Akiba, you agree to our <Link href="/terms">Terms of Service</Link>.</Typography>
 <Paper variant="outlined" sx={{mt:9,p:{xs:2,md:4},borderRadius:4,textAlign:'left',boxShadow:'0 25px 70px rgba(26,38,65,.12)'}}>
 <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="overline" color="text.secondary">Illustrative dashboard preview</Typography><Typography variant="h5">Family Celebration</Typography></Box><Chip label="Demo data" color="secondary"/></Stack>
 <Stack direction={{xs:'column',md:'row'}} spacing={2} sx={{mt:3}}>
 {[[ 'Group balance','KES 248,500'],['Total contributed','KES 312,000'],['Pending approval','KES 18,000']].map(([name,value])=><Paper key={name} variant="outlined" sx={{p:3,flex:1,borderRadius:3}}><Typography variant="body2" color="text.secondary">{name}</Typography><Typography variant="h4">{value}</Typography></Paper>)}</Stack>
 <Stack direction={{xs:'column',md:'row'}} spacing={3} sx={{mt:3}}>
 <Paper variant="outlined" sx={{p:3,flex:2,borderRadius:3}}><Typography variant="h6">Recent group activity</Typography>{[['Mary contributed','+ KES 15,000'],['Venue payment approved','− KES 24,000'],['James contributed','+ KES 8,500']].map(([a,b])=><Stack key={a} direction="row" justifyContent="space-between" sx={{py:2,borderBottom:'1px solid',borderColor:'divider'}}><Typography>{a}</Typography><Typography fontWeight={700}>{b}</Typography></Stack>)}</Paper>
 <Paper variant="outlined" sx={{p:3,flex:1,borderRadius:3}}><Typography variant="h6">Group chat</Typography><Typography sx={{mt:2}}>Mary: Venue deposit confirmed! 🎉</Typography><Typography sx={{mt:2,color:'text.secondary'}}>James: Great, I’ve contributed.</Typography><Typography sx={{mt:2}}>Admin: Thanks, everyone!</Typography></Paper></Stack></Paper>
 </Container></Box>;
}