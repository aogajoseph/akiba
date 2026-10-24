import * as React from 'react';
import { AppBar, Box, Button, Container, Drawer, IconButton, MenuItem, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ColorModeIconDropdown from '../shared-theme/ColorModeIconDropdown';
import Sitemark from './SitemarkIcon';
const links = [["About","#hero"],["Features","#features"],["How it works","#how-it-works"],["Getting Started","#getting-started"],["Pricing","#pricing"],["FAQs","#faq"]];
export default function AppAppBar() {
 const [open,setOpen]=React.useState(false);
 return <AppBar position="fixed" color="transparent" elevation={0} sx={{mt:3,backgroundImage:'none'}}>
 <Container maxWidth="xl"><Toolbar sx={{border:1,borderColor:'divider',borderRadius:3,backdropFilter:'blur(20px)',bgcolor:'background.paper',gap:2,py:1}}>
 <Box sx={{flex:1}}><Sitemark/></Box>
 <Box component="nav" sx={{display:{xs:'none',lg:'flex'},justifyContent:'center',gap:0.5,flex:3}}>
 {links.map(([label,href])=><Button key={href} href={href} color="inherit" size="small" sx={{textTransform:'none',whiteSpace:'nowrap'}}>{label}</Button>)}
 </Box>
 <Box sx={{flex:1,display:{xs:'none',lg:'flex'},justifyContent:'flex-end',alignItems:'center',gap:1}}>
 <Button href="/login" size="small">Sign In</Button><Button href="/signup" variant="contained" size="small">Create Account</Button><ColorModeIconDropdown/>
 </Box>
 <Box sx={{display:{xs:'flex',lg:'none'},alignItems:'center'}}><ColorModeIconDropdown/><IconButton aria-label="Open navigation" onClick={()=>setOpen(true)}><MenuIcon/></IconButton></Box>
 </Toolbar></Container>
 <Drawer anchor="top" open={open} onClose={()=>setOpen(false)}><Box sx={{p:3,pt:5}}><IconButton aria-label="Close navigation" onClick={()=>setOpen(false)}><CloseIcon/></IconButton>{links.map(([label,href])=><MenuItem key={href} component="a" href={href} onClick={()=>setOpen(false)}>{label}</MenuItem>)}<Button fullWidth href="/login">Sign In</Button><Button fullWidth href="/signup" variant="contained">Create Account</Button></Box></Drawer>
 </AppBar>;
}